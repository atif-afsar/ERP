import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, X, Send, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { publicAssistantService as api } from '../../services/aiAssistantService';
import { Rich } from './AssistantWidget';

type Msg = { role: 'USER' | 'ASSISTANT'; content: string; followUps?: string[]; actions?: { label: string; route: string }[]; error?: boolean };

const STARTERS = [
  'Which plan is right for a school with 400 students?',
  'How does payment and activation work?',
  'Does EzyAura support coaching institutes?',
];

// Typewriter for the public widget (mirrors the in-app version).
function TypewriterBubble({ text, onDone, className, scrollRef }: { text: string; onDone: () => void; className?: string; scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const [charIndex, setCharIndex] = useState(0);
  const done = charIndex >= text.length;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const msPerChar = text.length < 100 ? 18 : text.length < 300 ? 12 : text.length < 600 ? 6 : 3;
    const charsPerTick = msPerChar <= 6 ? 3 : 1;
    intervalRef.current = setInterval(() => {
      setCharIndex(prev => Math.min(prev + charsPerTick, text.length));
    }, msPerChar);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [text]);

  useEffect(() => {
    if (done) { if (intervalRef.current) clearInterval(intervalRef.current); onDone(); }
  }, [done, onDone]);

  useEffect(() => { scrollRef?.current?.scrollIntoView({ behavior: 'smooth' }); }, [charIndex, scrollRef]);

  const visible = text.slice(0, charIndex);
  return (
    <div className={className} onClick={() => { if (!done) setCharIndex(text.length); }} style={{ cursor: done ? undefined : 'pointer' }}>
      <Rich text={visible} />
      {!done && <span className="inline-block w-[2px] h-[1em] bg-slate-400 align-text-bottom ml-0.5 animate-pulse" />}
    </div>
  );
}

// Chat for visitors on the public website. Sends the last few turns with each
// question; nothing is saved on the server.
export const PublicAssistantWidget: React.FC<{ onNavigate: (route: 'pricing' | 'signup' | 'login') => void }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [typingMsgIndex, setTypingMsgIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);
  const handleTypingDone = useCallback(() => setTypingMsgIndex(null), []);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content }));
    setInput('');
    setMessages(m => [...m, { role: 'USER', content: message }]);
    setBusy(true);
    try {
      const r = (await api.chat(message, history)).data;
      setMessages(m => {
        const next = [...m, { role: 'ASSISTANT' as const, content: r.reply, followUps: r.followUps, actions: r.actions }];
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
  const go = (route: string) => {
    if (route === 'pricing' || route === 'signup' || route === 'login') { setOpen(false); onNavigate(route); }
  };

  return (
    <>
      {!open && (
        <button type="button" aria-label="Open EzyAura Assistant" onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-700">
          <Bot className="h-5 w-5" /><span>Ask us anything</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-label="EzyAura Assistant"
          className="fixed bottom-5 right-5 z-[60] flex w-[min(25rem,calc(100vw-2.5rem))] h-[min(36rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
          <header className="flex items-center gap-2 bg-emerald-600 px-3 py-2.5">
            <Bot className="h-5 w-5 text-white" />
            <div className="flex-1 leading-tight"><p className="text-sm font-bold text-white">EzyAura Assistant</p><p className="text-[11px] text-emerald-100">Questions about plans, features or getting started</p></div>
            {messages.length > 0 && <button type="button" title="Start over" aria-label="Start over" className="rounded-lg p-1.5 text-white hover:bg-white/15" onClick={() => { setMessages([]); setTypingMsgIndex(null); }}><RotateCcw className="h-4 w-4" /></button>}
            <button type="button" title="Close" aria-label="Close assistant" className="rounded-lg p-1.5 text-white hover:bg-white/15" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </header>
          <div className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-slate-700">Hi! I can explain EzyAura plans and features, or help you decide what fits your school or coaching institute.</p>
                <div className="flex flex-col gap-2">
                  {STARTERS.map(s => <button key={s} type="button" onClick={() => void ask(s)} className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-xs text-emerald-800 hover:bg-emerald-50">{s}</button>)}
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
                {typingMsgIndex !== i && (
                  <>
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.actions.map(a => <button key={a.route} type="button" onClick={() => go(a.route)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">{a.label}<ArrowRight className="h-3 w-3" /></button>)}
                      </div>
                    )}
                    {m.followUps && m.followUps.length > 0 && i === messages.length - 1 && (
                      <div className="flex flex-col gap-1">
                        {m.followUps.map(f => <button key={f} type="button" onClick={() => void ask(f)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100">{f}</button>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {busy && <div className="mr-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
            <div ref={endRef} />
          </div>
          <form className="flex items-end gap-2 border-t border-slate-200 bg-white p-2" onSubmit={e => { e.preventDefault(); void ask(input); }}>
            <textarea aria-label="Message" rows={1} maxLength={1500} value={input} placeholder="Ask about plans, features…"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
              className="max-h-28 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <button type="submit" aria-label="Send" disabled={busy || !input.trim()} className="rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </form>
          <p className="bg-white px-3 pb-2 text-[10px] text-slate-400">AI answers can be wrong. Don't share passwords here.</p>
        </section>
      )}
    </>
  );
};

