import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Plus, History, BookOpen, ThumbsUp, ThumbsDown, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { aiAssistantService as api } from '../../services/aiAssistantService';

type Msg = { id?: string; role: 'USER' | 'ASSISTANT'; content: string; followUps?: string[]; actions?: { label: string; route: string }[]; sources?: string[]; rating?: 1 | -1; error?: boolean };
type View = 'chat' | 'history' | 'faq';

const STARTERS: Record<string, string[]> = {
  TENANT_ADMIN: ['How do I import students from Excel?', 'How do I run payroll for this month?', 'Write a notice for a parent-teacher meeting'],
  TEACHER: ['How do I mark attendance?', 'How do I request leave?', 'Give me 5 quiz questions on fractions for Class 6'],
  ACCOUNTANT: ['How does fee proof approval work?', 'How do I send fee reminders?', 'Write a polite fee due reminder message'],
  PARENT: ['How do I pay fees by UPI?', 'Where can I see my child\'s results?', 'Tips to help my child prepare for exams'],
  STUDENT: ['Where is my timetable?', 'How do I scan the QR for attendance?', 'Explain photosynthesis simply'],
};

// Minimal markdown: paragraphs, "- " / "1. " lists and **bold**. Built as React
// nodes, never as HTML, so model output can't inject markup.
function Inline({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>)}</>;
}
export function Rich({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}><Inline text={it} /></li>);
    blocks.push(list.ordered ? <ol key={blocks.length} className="list-decimal pl-5 space-y-0.5">{items}</ol> : <ul key={blocks.length} className="list-disc pl-5 space-y-0.5">{items}</ul>);
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/), numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list = list || { ordered, items: [] };
      list.items.push((bullet || numbered)![1]);
    } else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}><Inline text={line.replace(/^#+\s*/, '')} /></p>);
    }
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

// Typewriter: reveals text character-by-character with a blinking cursor.
// Speed adapts to length so long answers don't take forever. Reports onDone when
// the full text has been revealed (or if the user clicks to skip).
function TypewriterBubble({ text, onDone, className, scrollRef }: { text: string; onDone: () => void; className?: string; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const [charIndex, setCharIndex] = useState(0);
  const done = charIndex >= text.length;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Adaptive speed: short texts type slower for a natural feel; long texts
    // speed up so users aren't kept waiting.
    const msPerChar = text.length < 100 ? 18 : text.length < 300 ? 12 : text.length < 600 ? 6 : 3;
    // Reveal in small chunks for very fast speeds to keep smooth rendering
    const charsPerTick = msPerChar <= 6 ? 3 : 1;
    intervalRef.current = setInterval(() => {
      setCharIndex(prev => {
        const next = Math.min(prev + charsPerTick, text.length);
        return next;
      });
    }, msPerChar);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text]);

  useEffect(() => {
    if (done) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onDone();
    }
  }, [done, onDone]);

  // Auto-scroll as text types in
  useEffect(() => {
    scrollRef?.current?.scrollIntoView({ behavior: 'smooth' });
  }, [charIndex, scrollRef]);

  const visible = text.slice(0, charIndex);

  return (
    <div className={className} onClick={() => { if (!done) { setCharIndex(text.length); } }} style={{ cursor: done ? undefined : 'pointer' }}>
      <Rich text={visible} />
      {!done && <span className="inline-block w-[2px] h-[1em] bg-slate-400 align-text-bottom ml-0.5 animate-pulse" />}
    </div>
  );
}

export const AssistantWidget: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const { currentUser, can } = useAuth();
  const { currentTenant } = useTenant();
  const t = currentTenant.id;
  const storageKey = `edunexus_ai_conversation:${currentUser.id}:${t}`;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(() => { try { return sessionStorage.getItem(storageKey) || undefined; } catch { return undefined; } });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  // Tracks which message index (if any) is currently being typed out
  const [typingMsgIndex, setTypingMsgIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const remember = (id?: string) => {
    setConversationId(id);
    try { if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); } catch { /* storage unavailable */ }
  };
  const loadConversation = async (id: string) => {
    try {
      const rows = (await api.messages(t, id)).data;
      setMessages(rows.map(m => ({ id: m.id, role: m.role, content: m.content, sources: (m.citations || []).map(c => c.documentTitle) })));
      setTypingMsgIndex(null);
      remember(id); setView('chat');
    } catch { remember(undefined); setMessages([]); }
  };
  useEffect(() => { if (open && conversationId && !messages.length) void loadConversation(conversationId); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  if (!currentUser.id || !can('ai.chat')) return null;

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput(''); setView('chat');
    setMessages(m => [...m, { role: 'USER', content: message }]);
    setBusy(true);
    try {
      const r = (await api.chat(t, { message, conversationId, currentRoute: window.location.hash })).data;
      remember(r.conversationId);
      setMessages(m => {
        const next = [...m, { id: r.messageId, role: 'ASSISTANT' as const, content: r.reply, followUps: r.followUps, actions: r.actions, sources: r.citations.map(c => c.documentTitle) }];
        setTypingMsgIndex(next.length - 1);
        return next;
      });
    } catch (e: any) {
      const text = e?.name === 'AbortError' ? 'That took too long. Please try again.' : e?.message || 'The assistant is unavailable right now.';
      setMessages(m => [...m, { role: 'ASSISTANT', content: text, error: true }]);
    } finally {
      setBusy(false);
    }
  };
  const rate = async (msg: Msg, rating: 1 | -1) => {
    if (!msg.id) return;
    setMessages(m => m.map(x => x === msg ? { ...x, rating } : x));
    try { await api.feedback(t, msg.id, rating); } catch { /* feedback is best-effort */ }
  };
  const newChat = () => { remember(undefined); setMessages([]); setTypingMsgIndex(null); setView('chat'); };
  const showHistory = async () => {
    setView('history');
    try { setHistory((await api.conversations(t)).data); } catch { setHistory([]); }
  };
  const starters = STARTERS[currentUser.role] || STARTERS.TENANT_ADMIN;
  const headerButton = 'rounded-lg p-1.5 text-emerald-50 hover:bg-white/15';
  const handleTypingDone = useCallback(() => setTypingMsgIndex(null), []);

  return (
    <>
      {!open && (
        <button type="button" aria-label="Open EduNexus Assistant" onClick={() => setOpen(true)}
          className="no-print fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700">
          <Bot className="h-5 w-5" /><span className="hidden sm:inline">Ask Assistant</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="EduNexus Assistant"
          className="no-print fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex w-[min(26rem,calc(100vw-2rem))] h-[min(38rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center gap-2 bg-emerald-600 px-3 py-2.5 text-white">
            <Bot className="h-5 w-5" />
            <div className="flex-1 leading-tight"><p className="text-sm font-semibold text-white">EduNexus Assistant</p><p className="text-[11px] text-emerald-100">Ask anything · powered by Gemini</p></div>
            <button type="button" title="New chat" aria-label="New chat" className={headerButton} onClick={newChat}><Plus className="h-4 w-4" /></button>
            <button type="button" title="Past chats" aria-label="Past chats" className={headerButton} onClick={() => void showHistory()}><History className="h-4 w-4" /></button>
            {can('ai.knowledge.manage') && <button type="button" title="School FAQ" aria-label="School FAQ" className={headerButton} onClick={() => setView('faq')}><BookOpen className="h-4 w-4" /></button>}
            <button type="button" title="Close" aria-label="Close assistant" className={headerButton} onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </header>

          {view === 'history' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-1 pb-1 text-xs font-semibold text-slate-500">Your past chats (only you can see these)</p>
              {history.length === 0 && <p className="p-3 text-sm text-slate-500">No past chats yet.</p>}
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 hover:bg-slate-50">
                  <button type="button" className="flex-1 text-left text-sm text-slate-800 truncate" onClick={() => void loadConversation(h.id)}>{h.title}</button>
                  <span className="text-[10px] text-slate-400">{new Date(h.updated_at).toLocaleDateString()}</span>
                  <button type="button" aria-label="Delete chat" className="text-slate-400 hover:text-rose-600" onClick={async () => { try { await api.deleteConversation(t, h.id); setHistory(x => x.filter(y => y.id !== h.id)); if (h.id === conversationId) newChat(); } catch { /* ignore */ } }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {view === 'faq' && <SchoolFaq tenantId={t} />}

          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-3 text-sm">
                {messages.length === 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-slate-700">Hi! Ask me how to do something in EduNexus, or anything else: drafting notices, teaching ideas, study help, Excel…</p>
                    <div className="flex flex-col gap-2">
                      {starters.map(s => <button key={s} type="button" onClick={() => void ask(s)} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-xs text-emerald-800 hover:bg-emerald-50">{s}</button>)}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => m.role === 'USER' ? (
                  <div key={i} className="ml-8 rounded-2xl rounded-br-sm bg-emerald-600 px-3 py-2 text-white whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div key={i} className="mr-4 space-y-2">
                    {typingMsgIndex === i && !m.error ? (
                      <TypewriterBubble
                        text={m.content}
                        onDone={handleTypingDone}
                        scrollRef={endRef}
                        className={`rounded-2xl rounded-bl-sm border px-3 py-2 border-slate-200 bg-white text-slate-800`}
                      />
                    ) : (
                      <div className={`rounded-2xl rounded-bl-sm border px-3 py-2 ${m.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-800'}`}><Rich text={m.content} /></div>
                    )}
                    {/* Show extras only when not mid-typing */}
                    {typingMsgIndex !== i && (
                      <>
                        {m.sources && m.sources.length > 0 && <p className="px-1 text-[11px] text-slate-500">From EduNexus help: {Array.from(new Set(m.sources)).join(' · ')}</p>}
                        {m.actions && m.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.actions.map(a => <button key={a.route} type="button" onClick={() => onNavigate(a.route)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100">{a.label}<ArrowRight className="h-3 w-3" /></button>)}
                          </div>
                        )}
                        {m.followUps && m.followUps.length > 0 && i === messages.length - 1 && (
                          <div className="flex flex-col gap-1">
                            {m.followUps.map(f => <button key={f} type="button" onClick={() => void ask(f)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{f}</button>)}
                          </div>
                        )}
                        {m.id && (
                          <div className="flex gap-1 px-1">
                            <button type="button" aria-label="Helpful" onClick={() => void rate(m, 1)} className={m.rating === 1 ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'}><ThumbsUp className="h-3.5 w-3.5" /></button>
                            <button type="button" aria-label="Not helpful" onClick={() => void rate(m, -1)} className={m.rating === -1 ? 'text-rose-600' : 'text-slate-300 hover:text-slate-500'}><ThumbsDown className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {busy && <div className="mr-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
                <div ref={endRef} />
              </div>
              <form className="flex items-end gap-2 border-t border-slate-200 p-2" onSubmit={e => { e.preventDefault(); void ask(input); }}>
                <textarea aria-label="Message" rows={1} maxLength={4000} value={input} placeholder="Ask anything…"
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <button type="submit" aria-label="Send" disabled={busy || !input.trim()} className="rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              </form>
              <p className="px-3 pb-2 text-[10px] text-slate-400">The assistant can make mistakes and can't see your institution's records.</p>
            </>
          )}
        </section>
      )}
    </>
  );
};

// Owners add their institution's own answers (timings, uniform, fee late rules…).
const ROLE_OPTIONS = [['ALL', 'Everyone'], ['PARENT', 'Parents'], ['STUDENT', 'Students'], ['TEACHER', 'Teachers'], ['ACCOUNTANT', 'Accountants'], ['STAFF', 'Office staff'], ['TENANT_ADMIN', 'Owners']] as const;
const SchoolFaq: React.FC<{ tenantId: string }> = ({ tenantId: t }) => {
  const [items, setItems] = useState<any[]>([]);
  const [draft, setDraft] = useState({ title: '', content: '', role: 'ALL' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => { try { setItems((await api.knowledge(t)).data); } catch (e: any) { setError(e.message); } };
  useEffect(() => { void load(); }, [t]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try { await api.addKnowledge(t, { title: draft.title, content: draft.content, allowedRoles: [draft.role] }); setDraft({ title: '', content: '', role: 'ALL' }); await load(); }
    catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };
  const field = 'w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-emerald-500 focus:outline-none';
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
      <p className="text-xs text-slate-600">Add answers specific to your institution, such as timings, uniform, holidays or fee late rules. The assistant uses them when people ask.</p>
      <form onSubmit={e => void save(e)} className="space-y-2 rounded-xl border border-slate-200 p-3">
        <input aria-label="FAQ title" required minLength={3} maxLength={240} placeholder="Title, e.g. School timings" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={field} />
        <textarea aria-label="FAQ answer" required minLength={40} rows={4} placeholder="The answer, written in full sentences (at least 40 characters)." value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} className={field} />
        <div className="flex items-center gap-2">
          <select aria-label="Visible to" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} className="rounded-lg border border-slate-300 p-1.5 text-xs">
            {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="submit" disabled={saving} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add to FAQ'}</button>
        </div>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </form>
      {items.length === 0 && <p className="text-xs text-slate-500">No FAQ articles yet.</p>}
      {items.map(d => (
        <div key={d.id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-start gap-2">
            <p className="flex-1 font-semibold text-slate-800">{d.title}</p>
            <span className="text-[10px] text-slate-400">{(d.allowed_roles || []).map((r: string) => ROLE_OPTIONS.find(o => o[0] === r)?.[1] || r).join(', ')}</span>
            <button type="button" aria-label="Remove FAQ" className="text-slate-400 hover:text-rose-600" onClick={async () => { try { await api.removeKnowledge(t, d.id); await load(); } catch (e: any) { setError(e.message); } }}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{d.content}</p>
        </div>
      ))}
    </div>
  );
};
