import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// EduNexus Assistant: Gemini is mocked by intercepting fetch to the Google API.
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-test-model';
let pool, server, base;
const password = `Ai!${randomBytes(6).toString('hex')}`;
const t = {};
const geminiCalls = [];
let geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: 'Mock answer [1].', followUps: ['Next?'], actions: [{ label: 'Open Students', route: 'app/students' }, { label: 'Bad', route: 'app/library' }] }) }] } }] } });

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://generativelanguage.googleapis.com/')) {
    geminiCalls.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    const r = geminiReply();
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, init);
};

const call = async (token, route, method = 'GET', body) => {
  const response = await realFetch(`${base}/api/v1${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, data: json.data, error: json.error };
};

async function institution(suffix) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(password, 4);
  const tenant = (await pool.query(`INSERT INTO tenants(name, slug, tenant_type, status) VALUES($1, $2, 'school', 'active') RETURNING id`,
    [`AI ${suffix}`, `ai-${suffix}-${randomBytes(3).toString('hex')}`])).rows[0].id;
  const plan = (await pool.query(`SELECT id FROM subscription_plans WHERE code = 'GROWTH_MONTHLY'`)).rows[0].id;
  await pool.query(`INSERT INTO tenant_subscriptions(tenant_id, plan_id, status, current_period_start, current_period_end)
    VALUES($1, $2, 'ACTIVE', NOW() - interval '1 day', NOW() + interval '30 days')`, [tenant, plan]);
  const user = async role => {
    const email = `${role.toLowerCase()}-${suffix}-${randomBytes(3).toString('hex')}@ai.example.test`;
    const id = (await pool.query(`INSERT INTO users(email, password_hash, status) VALUES($1, $2, 'ACTIVE') RETURNING id`, [email, hash])).rows[0].id;
    await pool.query(`INSERT INTO profiles(id, display_name, status) VALUES($1, $2, 'active') ON CONFLICT(id) DO NOTHING`, [id, role]);
    await pool.query(`INSERT INTO memberships(user_id, tenant_id, role_id, status) SELECT $1, $2, id, 'active' FROM roles WHERE key = $3 AND tenant_id IS NULL`, [id, tenant, role]);
    return { id, token: (await call(null, '/auth/signin', 'POST', { email, password })).data.token };
  };
  return { tenant, user };
}

before(async () => {
  assert.match(new URL(process.env.DATABASE_URL).pathname, /_test$/);
  ({ pool } = await import('../src/db.ts'));
  const { default: app } = await import('../src/server.ts');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const a = await institution('a'), b = await institution('b');
  t.tenant = a.tenant; t.otherTenant = b.tenant;
  t.owner = await a.user('TENANT_ADMIN');
  t.teacher = await a.user('TEACHER');
  t.parent = await a.user('PARENT');
  t.otherOwner = await b.user('TENANT_ADMIN');
});

after(async () => {
  globalThis.fetch = realFetch;
  await pool.query(`UPDATE tenants SET status='inactive' WHERE id=ANY($1::uuid[])`, [[t.tenant, t.otherTenant]]);
  await new Promise(resolve => server.close(resolve));
  await pool.end();
});

test('chat requires authentication', async () => {
  assert.equal((await call(null, '/ai/chat', 'POST', { message: 'hi' })).status, 401);
});

test('an EduNexus question is answered with V1 help articles and saved to a private conversation', async () => {
  geminiCalls.length = 0;
  const r = await call(t.teacher.token, '/ai/chat', 'POST', { message: 'How do I import students from an Excel file?', currentRoute: '#/app/students' });
  assert.equal(r.status, 200);
  assert.equal(r.data.reply, 'Mock answer [1].');
  assert.equal(r.data.grounded, true);
  assert.ok(r.data.citations.some(c => c.documentTitle === 'Admitting and importing students'));
  assert.deepEqual(r.data.actions, [{ label: 'Open Students', route: 'app/students' }], 'routes outside the allow-list are dropped');
  const sent = geminiCalls[0];
  assert.match(sent.url, /models\/gemini-test-model:generateContent$/);
  assert.equal(sent.headers['x-goog-api-key'], 'test-gemini-key');
  assert.match(sent.body.contents.at(-1).parts[0].text, /Admitting and importing students/);
  assert.match(sent.body.systemInstruction.parts[0].text, /teacher/);
  t.conversation = r.data.conversationId;
  const messages = await call(t.teacher.token, `/ai/conversations/${t.conversation}/messages`);
  assert.deepEqual(messages.data.map(m => m.role), ['USER', 'ASSISTANT']);
  assert.equal((await call(t.parent.token, `/ai/conversations/${t.conversation}/messages`)).status, 404);
  assert.equal((await call(t.otherOwner.token, `/ai/conversations/${t.conversation}/messages`)).status, 404);
});

test('a Hinglish question still finds the matching help article', async () => {
  const r = await call(t.teacher.token, '/ai/chat', 'POST', { message: 'mujhe leave apply karni hai, kaise karu?' });
  assert.ok(r.data.citations.some(c => c.documentTitle === 'Staff, leave, staff attendance and payroll'));
});

test('archived V2 articles are no longer retrieved', async () => {
  const r = await call(t.owner.token, '/ai/chat', 'POST', { message: 'library ISBN issue return renewal overdue copies' });
  assert.equal(r.status, 200);
  assert.ok(!r.data.citations.some(c => c.documentTitle === 'Library operations'));
});

test('a general question is still answered and history is sent on follow-ups', async () => {
  geminiCalls.length = 0;
  geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: '{"answer":"Photosynthesis is how plants make food."}' }] } }] } });
  const first = await call(t.teacher.token, '/ai/chat', 'POST', { message: 'Explain photosynthesis simply', conversationId: t.conversation });
  assert.equal(first.status, 200);
  assert.equal(first.data.reply, 'Photosynthesis is how plants make food.');
  assert.deepEqual(first.data.followUps, []);
  assert.equal(geminiCalls[0].body.contents.length, 3, 'two earlier turns plus the new question');
  assert.equal(geminiCalls[0].body.contents[1].role, 'model');
  assert.equal((await call(t.parent.token, '/ai/chat', 'POST', { message: 'hello', conversationId: t.conversation })).status, 404);
});

test('provider failures return a friendly error and save nothing', async () => {
  const before = (await pool.query('SELECT COUNT(*)::int n FROM ai_messages WHERE tenant_id=$1', [t.tenant])).rows[0].n;
  geminiReply = () => ({ status: 500, body: { error: { message: 'API key expired. secret details' } } });
  const r = await call(t.owner.token, '/ai/chat', 'POST', { message: 'What is the fee approval process?' });
  assert.equal(r.status, 502); assert.equal(r.error.code, 'AI_PROVIDER_ERROR');
  assert.doesNotMatch(r.error.message, /secret|key/i);
  geminiReply = () => ({ status: 429, body: {} });
  assert.equal((await call(t.owner.token, '/ai/chat', 'POST', { message: 'hello again' })).error.code, 'AI_RATE_LIMITED');
  geminiReply = () => ({ status: 200, body: { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] } });
  const blocked = await call(t.owner.token, '/ai/chat', 'POST', { message: 'blocked question' });
  assert.equal(blocked.status, 200); assert.match(blocked.data.reply, /can't help/);
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM ai_messages WHERE tenant_id=$1', [t.tenant])).rows[0].n, before + 2, 'only the blocked exchange was saved');
  geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] } });
});

test('an overloaded main model falls back to the lighter model', async () => {
  geminiCalls.length = 0;
  geminiReply = () => geminiCalls.length === 1
    ? { status: 503, body: { error: { message: 'high demand' } } }
    : { status: 200, body: { candidates: [{ content: { parts: [{ text: '{"answer":"Line one\\\\nLine two"}' }] } }] } };
  const r = await call(t.owner.token, '/ai/chat', 'POST', { message: 'Tips for a parent meeting' });
  assert.equal(r.status, 200);
  assert.equal(r.data.reply, 'Line one\nLine two', 'double-escaped newlines are repaired');
  assert.deepEqual(geminiCalls.map(c => c.url.match(/models\/([^:]+):/)[1]), ['gemini-test-model', 'gemini-3.1-flash-lite']);
  assert.equal(geminiCalls[1].body.generationConfig.thinkingConfig.thinkingLevel, 'low');
  const stored = (await pool.query(`SELECT model FROM ai_messages WHERE id=$1`, [r.data.messageId])).rows[0];
  assert.equal(stored.model, 'gemini-3.1-flash-lite');
  geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] } });
});

test('owners add institution FAQ articles that only their institution retrieves', async () => {
  assert.equal((await call(t.teacher.token, '/ai/knowledge', 'POST', { title: 'Nope', content: 'x'.repeat(50) })).status, 403);
  const created = await call(t.owner.token, '/ai/knowledge', 'POST', {
    title: 'School timings', content: 'Morning assembly begins at 7:45 AM. Classes run from 8:00 AM to 2:10 PM, Monday to Saturday. The gate closes at 8:05 AM.',
  });
  assert.equal(created.status, 201);
  assert.equal((await call(t.owner.token, '/ai/knowledge', 'POST', { title: 'Copy', content: 'Morning assembly begins at 7:45 AM. Classes run from 8:00 AM to 2:10 PM, Monday to Saturday. The gate closes at 8:05 AM.' })).error.code, 'AI_DOCUMENT_EXISTS');
  const mine = await call(t.parent.token, '/ai/chat', 'POST', { message: 'What time does morning assembly begin?' });
  assert.ok(mine.data.citations.some(c => c.documentTitle === 'School timings'));
  const other = await call(t.otherOwner.token, '/ai/chat', 'POST', { message: 'What time does morning assembly begin?' });
  assert.ok(!other.data.citations.some(c => c.documentTitle === 'School timings'));
  assert.equal((await call(t.owner.token, '/ai/knowledge')).data.length, 1);
  assert.equal((await call(t.otherOwner.token, `/ai/knowledge/${created.data.id}`, 'DELETE')).status, 404);
  assert.equal((await call(t.owner.token, `/ai/knowledge/${created.data.id}`, 'DELETE')).status, 200);
  const after = await call(t.parent.token, '/ai/chat', 'POST', { message: 'What time does morning assembly begin?' });
  assert.ok(!after.data.citations.some(c => c.documentTitle === 'School timings'));
});

test('public website chat works without sign-in, quotes live prices and stores nothing', async () => {
  geminiCalls.length = 0;
  geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: 'Starter is ₹1,999 per month.', actions: [{ label: 'See plans', route: 'pricing' }, { label: 'Students', route: 'app/students' }] }) }] } }] } });
  const before = (await pool.query('SELECT COUNT(*)::int n FROM ai_messages')).rows[0].n;
  const r = await call(null, '/public-assistant/chat', 'POST', { message: 'How much does EduNexus cost?', history: [{ role: 'USER', content: 'hi' }, { role: 'ASSISTANT', content: 'Hello!' }] });
  assert.equal(r.status, 200);
  assert.equal(r.data.reply, 'Starter is ₹1,999 per month.');
  assert.deepEqual(r.data.actions, [{ label: 'See plans', route: 'pricing' }], 'only public routes');
  const sent = geminiCalls[0].body;
  assert.match(sent.systemInstruction.parts[0].text, /visitor who is not signed in/);
  const turn = sent.contents.at(-1).parts[0].text;
  assert.match(turn, /Starter: ₹1,999 per month, up to 300 active students/);
  assert.match(turn, /Pro: ₹6,999 per month, unlimited students/);
  assert.doesNotMatch(turn, /Coaching Plan|Enterprise/);
  assert.equal(sent.contents.length, 3);
  assert.equal((await pool.query('SELECT COUNT(*)::int n FROM ai_messages')).rows[0].n, before);
  assert.equal((await call(null, '/public-assistant/chat', 'POST', { message: 'x', history: Array(7).fill({ role: 'USER', content: 'a' }) })).status, 422);
  geminiReply = () => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] } }] } });
});

test('feedback and deleting a conversation are owner-only', async () => {
  const r = await call(t.parent.token, '/ai/chat', 'POST', { message: 'How do I pay fees by UPI?' });
  assert.equal((await call(t.teacher.token, '/ai/feedback', 'POST', { messageId: r.data.messageId, rating: 1 })).status, 404);
  assert.equal((await call(t.parent.token, '/ai/feedback', 'POST', { messageId: r.data.messageId, rating: -1 })).data.rating, -1);
  assert.equal((await call(t.teacher.token, `/ai/conversations/${r.data.conversationId}`, 'DELETE')).status, 404);
  assert.equal((await call(t.parent.token, `/ai/conversations/${r.data.conversationId}`, 'DELETE')).status, 200);
  assert.equal((await call(t.parent.token, '/ai/conversations')).data.filter(c => c.id === r.data.conversationId).length, 0);
});
