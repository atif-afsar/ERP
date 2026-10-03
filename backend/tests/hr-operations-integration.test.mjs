import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
const { pool } = await import('../src/db.ts');
const { default: app } = await import('../src/server.ts');
const { createToken } = await import('../src/routes/auth.ts');
const tenant = randomUUID(), otherTenant = randomUUID();
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1/hr`;
async function account(role, scope = tenant) {
  const id = randomUUID(), email = `${id}@example.test`;
  await pool.query(`INSERT INTO users(id,email,password_hash,status) VALUES($1,$2,'test-hash','ACTIVE')`, [id, email]);
  await pool.query(`INSERT INTO profiles(id,display_name,status) VALUES($1,'HR fixture','active')`, [id]);
  const r = (await pool.query(`SELECT id FROM roles WHERE key=$1 AND tenant_id IS NULL`, [role])).rows[0];
  await pool.query(`INSERT INTO memberships(tenant_id,user_id,role_id,status) VALUES($1,$2,$3,'active')`, [scope, id, r.id]);
  const version = (await pool.query('SELECT auth_version FROM users WHERE id=$1', [id])).rows[0].auth_version;
  return { id, token: createToken({ id, email, role, tenantId: scope, version }) };
}
async function request(user, path, method = 'GET', body, headers = {}) {
  const res = await fetch(base + path, { method, headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, ...(await res.json()) };
}
let admin, teacher, outsider, accountant, staff, foreignStaff, type, leave;
test('Phase 11A PostgreSQL authenticated HR workflow', async t => {
  await pool.query(`INSERT INTO tenants(id,name,slug,tenant_type,status) VALUES($1,'HR integration fixture',$2,'school','active'),($3,'Other HR fixture',$4,'school','active')`, [tenant, `hr-${tenant}`, otherTenant, `hr-${otherTenant}`]);
  admin = await account('TENANT_ADMIN'); teacher = await account('TEACHER'); outsider = await account('TEACHER', otherTenant); accountant = await account('ACCOUNTANT');
  for (const [user, scope] of [[teacher, tenant], [outsider, otherTenant]]) {
    const r = (await pool.query(`INSERT INTO staff(tenant_id,user_id,employee_id,name,designation,department) VALUES($1,$2,$3,'Teacher fixture','Teacher','Teaching') RETURNING id`, [scope, user.id, randomUUID()])).rows[0];
    if (scope === tenant) staff = r.id; else foreignStaff = r.id;
  }
  await t.test('authentication required and teachers cannot administer HR', async () => {
    assert.equal((await fetch(base + '/requests')).status, 401);
    assert.equal((await request(teacher, '/dashboard')).status, 403);
    assert.equal((await request(teacher, '/types', 'POST', { name: 'Unsafe' })).status, 403);
    assert.equal((await request(accountant, '/dashboard')).status, 403);
  });
  await t.test('owner configures a tenant leave type and period balance', async () => {
    const r = await request(admin, '/types', 'POST', { name: 'Casual Leave', paid: true }); assert.equal(r.status, 201); type = r.data.id;
    assert.equal((await request(admin, '/balances', 'PUT', { staffId: staff, leaveTypeId: type, year: 2027, entitlement: 3 })).status, 200);
    assert.equal((await request(admin, '/balances', 'PUT', { staffId: foreignStaff, leaveTypeId: type, year: 2027, entitlement: 3 })).status, 422);
  });
  await t.test('staff creates and sees own request only', async () => {
    const r = await request(teacher, '/requests', 'POST', { leaveTypeId: type, startDate: '2027-02-01', endDate: '2027-02-02', reason: 'Family visit' }); assert.equal(r.status, 201); leave = r.data.id;
    assert.equal((await request(teacher, '/requests')).data.length, 1);
    assert.equal((await request(outsider, '/requests')).data.length, 0);
    assert.equal((await request(teacher, '/requests', 'POST', { leaveTypeId: type, startDate: '2027-02-02', endDate: '2027-02-03', reason: 'Overlap' })).status, 409);
  });
  await t.test('permission and tenant isolation reject unauthorized review', async () => {
    assert.equal((await request(teacher, `/requests/${leave}/review`, 'POST', { status: 'APPROVED' })).status, 403);
    assert.equal((await request(outsider, '/requests', 'GET', undefined, { 'x-tenant-id': tenant })).status, 403);
    assert.equal((await request(admin, '/attendance', 'PUT', { staffId: foreignStaff, date: '2027-02-01', status: 'PRESENT' })).status, 422);
  });
  await t.test('concurrent approval succeeds once, with atomic balance and attendance', async () => {
    const r = await Promise.all([1, 2].map(() => request(admin, `/requests/${leave}/review`, 'POST', { status: 'APPROVED' })));
    assert.deepEqual(r.map(x => x.status).sort(), [200, 409]);
    assert.equal((await request(teacher, '/balances')).data[0].remaining, 1);
    const a = (await pool.query('SELECT * FROM staff_attendance WHERE tenant_id=$1 AND leave_request_id=$2', [tenant, leave])).rows;
    assert.equal(a.length, 2); assert.ok(a.every(x => x.status === 'LEAVE'));
    assert.equal((await request(admin, '/attendance', 'PUT', { staffId: staff, date: '2027-02-01', status: 'PRESENT' })).status, 409);
  });
  await t.test('approval writes durable audit and two transactional notification jobs', async () => {
    assert.equal((await pool.query(`SELECT COUNT(*)::int n FROM audit_logs WHERE tenant_id=$1 AND action='LEAVE_APPROVED'`, [tenant])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT COUNT(*)::int n FROM notification_jobs j JOIN notifications n ON n.id=j.notification_id WHERE n.tenant_id=$1 AND n.source_id=$2`, [tenant, leave])).rows[0].n, 2);
  });
  await t.test('insufficient balance rolls approval back without attendance or notification', async () => {
    const r = await request(teacher, '/requests', 'POST', { leaveTypeId: type, startDate: '2027-03-01', endDate: '2027-03-02', reason: 'Another visit' }); assert.equal(r.status, 201);
    assert.equal((await request(admin, `/requests/${r.data.id}/review`, 'POST', { status: 'APPROVED' })).status, 409);
    assert.equal((await request(teacher, '/balances')).data[0].used, 2);
    assert.equal((await pool.query('SELECT COUNT(*)::int n FROM staff_attendance WHERE leave_request_id=$1', [r.data.id])).rows[0].n, 0);
    assert.equal((await request(teacher, `/requests/${r.data.id}/cancel`, 'POST')).status, 200);
  });
  await t.test('rejection preserves balance and pending cancellation is own-only', async () => {
    const r = await request(teacher, '/requests', 'POST', { leaveTypeId: type, startDate: '2027-04-01', endDate: '2027-04-01', reason: 'Personal reason' });
    assert.equal((await request(outsider, `/requests/${r.data.id}/cancel`, 'POST')).status, 409);
    assert.equal((await request(admin, `/requests/${r.data.id}/review`, 'POST', { status: 'REJECTED', note: 'Coverage unavailable' })).status, 200);
    assert.equal((await request(teacher, '/balances')).data[0].used, 2);
  });
  await t.test('self-approval denied even after explicitly granting reviewer permission', async () => {
    const role = (await pool.query(`INSERT INTO roles(tenant_id,key,name) VALUES($1,$2,'HR fixture reviewer') RETURNING id`, [tenant, `TEST_${randomUUID().replaceAll('-', '').toUpperCase()}`])).rows[0];
    await pool.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions WHERE key IN ('hr.leave.request','hr.leave.approve')`, [role.id]);
    await pool.query('UPDATE memberships SET role_id=$3 WHERE tenant_id=$1 AND user_id=$2', [tenant, teacher.id, role.id]);
    const key = (await pool.query('SELECT key FROM roles WHERE id=$1', [role.id])).rows[0].key;
    teacher.token = createToken({ id: teacher.id, email: `${teacher.id}@example.test`, role: key, tenantId: tenant, version: (await pool.query('SELECT auth_version FROM users WHERE id=$1', [teacher.id])).rows[0].auth_version });
    const r = await request(teacher, '/requests', 'POST', { leaveTypeId: type, startDate: '2027-05-01', endDate: '2027-05-01', reason: 'Own review test' });
    assert.equal(r.status, 201); assert.equal((await request(teacher, `/requests/${r.data.id}/review`, 'POST', { status: 'APPROVED' })).status, 403);
  });
  await t.test('read-only HR permission can view tenant requests without request rights', async () => {
    const role = (await pool.query(`INSERT INTO roles(tenant_id,key,name) VALUES($1,$2,'HR read fixture') RETURNING id`, [tenant, `VIEW_${randomUUID().replaceAll('-', '').toUpperCase()}`])).rows[0];
    await pool.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions WHERE key='hr.view'`, [role.id]);
    await pool.query('UPDATE memberships SET role_id=$3 WHERE tenant_id=$1 AND user_id=$2', [tenant, accountant.id, role.id]);
    const key=(await pool.query('SELECT key FROM roles WHERE id=$1',[role.id])).rows[0].key;
    accountant.token=createToken({id:accountant.id,email:`${accountant.id}@example.test`,role:key,tenantId:tenant,version:(await pool.query('SELECT auth_version FROM users WHERE id=$1',[accountant.id])).rows[0].auth_version});
    assert.equal((await request(accountant,'/types')).status,200);assert.equal((await request(accountant,'/requests')).status,200);assert.equal((await request(accountant,'/balances')).status,200);
    assert.equal((await request(accountant,'/requests','POST',{leaveTypeId:type,startDate:'2027-06-01',endDate:'2027-06-01',reason:'Unauthorized request'})).status,403);
    assert.equal((await request(admin,'/requests/not-a-uuid/review','POST',{status:'APPROVED'})).status,422);
  });
  await t.test('manual staff attendance upserts consistently and HR staff selection needs no Phase 5 administration',async()=>{
    assert.equal((await request(accountant,'/staff')).status,200);
    assert.equal((await request(accountant,'/attendance','PUT',{staffId:staff,date:'2027-07-01',status:'PRESENT'})).status,403);
    const a=await request(admin,'/attendance','PUT',{staffId:staff,date:'2027-07-01',status:'PRESENT'});assert.equal(a.status,200);
    const b=await request(admin,'/attendance','PUT',{staffId:staff,date:'2027-07-01',status:'LATE'});assert.equal(b.status,200);assert.equal(b.data.id,a.data.id);
    assert.equal((await request(admin,'/attendance?date=2027-07-01')).data[0].status,'LATE');
  });
});
after(async () => {
  // Append-only audit is intentionally retained; deactivate uniquely named fixtures instead of deleting history.
  await pool.query(`UPDATE notification_jobs SET status='SKIPPED' WHERE tenant_id=ANY($1::uuid[]) AND status='QUEUED'`, [[tenant, otherTenant]]);
  await pool.query(`UPDATE tenants SET status='inactive' WHERE id=ANY($1::uuid[])`, [[tenant, otherTenant]]);
  await new Promise(resolve => server.close(resolve)); await pool.end();
});
