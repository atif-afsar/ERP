import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ExternalLink
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { queryAiAssistant, AiAction } from '../../services/aiKnowledgeService';
import { RagCitation } from '../../services/rag/ragTypes';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actions?: AiAction[];
  citations?: RagCitation[];
  followUps?: string[];
  groundedModel?: string;
  isStreaming?: boolean;
}

interface GlobalAiAssistantBotProps {
  onNavigate: (route: string) => void;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const STARTER_PROMPTS = [
  'How does fee collection work?',
  'How to mark QR attendance?',
  'How do I enroll a new student?',
  'What are the CBSE grading rules?',
  'How is staff payroll calculated?',
  'Explain the 2-tier BYOK payment model',
];

/**
 * Rich Markdown Text and Table Renderer
 */
const ChatMarkdownRenderer: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="leading-relaxed font-normal whitespace-pre-wrap">{content}</p>;
  }

  // Split into raw lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Table Detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
        const dataRows = tableLines.slice(2).map(row => 
          row.split('|').map(c => c.trim()).filter(Boolean)
        );

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-800 font-semibold">
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2">
                      {renderInlineFormatting(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Heading 3 (###)
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5 flex items-center gap-1.5">
          {renderInlineFormatting(line.replace('### ', ''))}
        </h4>
      );
      i++;
      continue;
    }

    // 3. Heading 4 (####)
    if (line.startsWith('#### ')) {
      elements.push(
        <h5 key={`h4-${i}`} className="text-xs font-bold text-emerald-900 mt-2 mb-1">
          {renderInlineFormatting(line.replace('#### ', ''))}
        </h5>
      );
      i++;
      continue;
    }

    // 4. Blockquote (> )
    if (line.startsWith('> ')) {
      elements.push(
        <div key={`quote-${i}`} className="my-2 p-2.5 rounded-lg bg-emerald-50/70 border-l-3 border-emerald-600 text-xs text-emerald-950">
          {renderInlineFormatting(line.replace(/^>\s*/, ''))}
        </div>
      );
      i++;
      continue;
    }

    // 5. Horizontal Divider (---)
    if (line.trim() === '---') {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-slate-100" />);
      i++;
      continue;
    }

    // 6. Bullet List (- , * , • )
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-slate-700 leading-relaxed text-xs">
          {renderInlineFormatting(line.replace(/^[-*•]\s*/, ''))}
        </li>
      );
      i++;
      continue;
    }

    // 7. Numbered List (1. , 2. )
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={`num-${i}`} className="ml-1 my-0.5 text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed">
          <span className="font-bold text-emerald-700 text-[11px] shrink-0">{numberedMatch[1]}.</span>
          <span>{renderInlineFormatting(numberedMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Normal Paragraph (skip pure empty lines if consecutive)
    if (line.trim().length > 0) {
      elements.push(
        <p key={`p-${i}`} className="leading-relaxed text-slate-700 my-1 text-xs sm:text-sm">
          {renderInlineFormatting(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
};

/**
 * Helper to parse bold (**), code (`), and badges
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // First split by backticks for code
  const codeParts = text.split('`');
  return codeParts.map((codePart, idx) => {
    if (idx % 2 === 1) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-emerald-800 font-mono text-[11px] border border-slate-200">
          {codePart}
        </code>
      );
    }

    // Split by bold (**)
    const boldParts = codePart.split('**');
    return boldParts.map((bPart, bIdx) => {
      if (bIdx % 2 === 1) {
        return (
          <strong key={bIdx} className="font-semibold text-slate-900">
            {bPart}
          </strong>
        );
      }
      return bPart;
    });
  });
}

export const GlobalAiAssistantBot: React.FC<GlobalAiAssistantBotProps> = ({
  onNavigate,
  isOpen: controlledIsOpen,
  onOpen,
  onClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const isChatOpen = controlledIsOpen !== undefined ? (controlledIsOpen || internalIsOpen) : internalIsOpen;

  const handleClose = () => {
    setInternalIsOpen(false);
    onClose?.();
  };

  const handleOpen = () => {
    setInternalIsOpen(true);
    onOpen?.();
  };

  const { currentTenant, isSchool } = useTenant();
  const { currentUser, isAuthenticated } = useAuth();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `👋 **Hi! How can I help you today?**

Ask me anything about fees, QR attendance, CBSE grading, staff payroll, or student admissions.`,
      timestamp: 'Just now',
      followUps: [
        'What are the late fee grace periods?',
        'How to mark QR attendance?',
        'What are the CBSE grading rules?',
      ],
    },
  ]);

  const hasUserSentMessage = messages.some((m) => m.sender === 'user');

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isTyping, isChatOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRating = (id: string, type: 'up' | 'down') => {
    setRatings(prev => ({ ...prev, [id]: type }));
  };

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history turns for multi-turn context
      const historyTurns = messages.map(m => ({ sender: m.sender, text: m.text }));

      const response = await queryAiAssistant(
        queryText, 
        {
          role: currentUser?.role || 'Visitor',
          isLoggedIn: isAuthenticated,
          tenantName: currentTenant?.name || 'EduNexus Platform',
          isSchool: isSchool,
          activeStudentName: currentUser?.name,
          currentRoute: window.location.hash || '#/',
        },
        historyTurns
      );

      const aiMsgId = `ai-${Date.now()}`;
      const fullReply = response.reply;

      // Realistic smooth streaming typing effect (ChatGPT style)
      const words = fullReply.split(' ');
      
      // If reply is short, render directly
      if (words.length <= 15) {
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          sender: 'ai',
          text: fullReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: response.actions,
          citations: response.citations,
          followUps: response.followUps,
          groundedModel: response.ragGrounding?.model,
          isStreaming: false,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
      } else {
        // Stream progressively over ~400ms
        const initialMsg: ChatMessage = {
          id: aiMsgId,
          sender: 'ai',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: response.actions,
          citations: response.citations,
          followUps: response.followUps,
          groundedModel: response.ragGrounding?.model,
          isStreaming: true,
        };

        setMessages((prev) => [...prev, initialMsg]);
        setIsTyping(false);

        let wordIndex = 0;
        const chunkSize = Math.max(2, Math.floor(words.length / 25));
        
        const streamInterval = setInterval(() => {
          wordIndex += chunkSize;
          if (wordIndex >= words.length) {
            clearInterval(streamInterval);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, text: fullReply, isStreaming: false } : m
              )
            );
          } else {
            const streamedText = words.slice(0, wordIndex).join(' ');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, text: streamedText } : m
              )
            );
          }
        }, 16);
      }
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `### 💡 EduNexus Assistant
I can assist you with:
- **Fees & Tuition**: BYOK payment gateway & 3-copy receipts
- **Attendance**: Smart QR Gate Kiosk & CBSE 75% rule
- **Academics**: 8-point grading marksheets & coaching ranks
- **Payroll**: 1-click batch staff salary generation`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: 'Fee Collection Desk', route: 'app/fees' },
          { label: 'QR Attendance Kiosk', route: 'app/attendance' },
        ],
        followUps: [
          'How does fee collection work?',
          'What are the CBSE grading rules?',
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `👋 **Chat cleared.** How can I help you today? Ask me any question about EduNexus ERP!`,
        timestamp: 'Just now',
        actions: [
          { label: 'Fee Collection Desk', route: 'app/fees' },
          { label: 'QR Attendance Kiosk', route: 'app/attendance' },
        ],
        followUps: [
          'How does fee collection work?',
          'How to mark QR attendance?',
          'What are the CBSE grading rules?',
        ],
      },
    ]);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {/* ------------------------------------------------------------- */}
      {!isChatOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 animate-fade-in">
          <button
            onClick={handleOpen}
            className="hidden sm:flex items-center gap-2 bg-white text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-full border border-slate-200 shadow-lg hover:shadow-xl hover:border-emerald-500 transition-all hover:scale-102 cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Chat with AI Assistant</span>
          </button>

          <button
            onClick={handleOpen}
            className="group relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/20 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white cursor-pointer"
            title="Open EduNexus Assistant"
            aria-label="Open EduNexus Assistant"
          >
            <Bot className="w-6 h-6 text-white transition-transform group-hover:scale-110" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-300 border-2 border-white" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. CHATGPT-GRADE COMMON BOT WINDOW */}
      {/* ------------------------------------------------------------- */}
      {isChatOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 shadow-2xl flex flex-col overflow-hidden bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl ${
            isExpanded
              ? 'inset-3 sm:inset-6'
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] h-[640px] max-h-[92vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white flex items-center justify-between shrink-0 shadow-xs select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-white/20 p-0.5 flex items-center justify-center text-white border border-white/30 shrink-0">
                <img src="/logo.png" alt="EduNexus AI" className="w-full h-full object-contain rounded-lg" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm leading-tight">
                  EduNexus Assistant
                </h3>
                <p className="text-[10px] text-emerald-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="New Chat / Clear"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:block p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 text-emerald-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs mt-0.5 p-0.5">
                    <img src="/logo.png" alt="EduNexus" className="w-full h-full object-contain rounded-md" />
                  </div>
                )}

                <div className="max-w-[88%] sm:max-w-[85%] space-y-1.5">
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl shadow-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-xs font-normal text-xs sm:text-sm'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Rich Markdown & Table Renderer */}
                    <ChatMarkdownRenderer content={msg.text} isUser={msg.sender === 'user'} />

                    {/* Streaming typing cursor indicator */}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-emerald-600 animate-pulse ml-0.5 align-middle" />
                    )}

                    {/* Quick navigation link if relevant */}
                    {msg.actions && msg.actions.length > 0 && !msg.isStreaming && (
                      <div className="pt-2 mt-2 border-t border-slate-100 flex flex-wrap gap-2">
                        {msg.actions.slice(0, 1).map((act, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              onNavigate(act.route);
                              if (!isExpanded) handleClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            <span>Open {act.label}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Initial Suggested Prompts (only on welcome message) */}
                    {msg.followUps && msg.followUps.length > 0 && !msg.isStreaming && msg.id === 'welcome-1' && !hasUserSentMessage && (
                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5">
                          {msg.followUps.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              onClick={() => handleSend(prompt)}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors border border-slate-200 hover:border-emerald-300 cursor-pointer"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Toolbar: Copy, Feedback & Timestamp */}
                  <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${msg.sender === 'user' ? 'justify-end' : 'justify-between'}`}>
                    {msg.sender === 'ai' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <span className="text-slate-200">•</span>

                        <button
                          onClick={() => handleRating(msg.id, 'up')}
                          className={`hover:text-emerald-600 transition-colors cursor-pointer ${ratings[msg.id] === 'up' ? 'text-emerald-600 font-bold' : ''}`}
                          title="Helpful"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRating(msg.id, 'down')}
                          className={`hover:text-rose-600 transition-colors cursor-pointer ${ratings[msg.id] === 'down' ? 'text-rose-600 font-bold' : ''}`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <span>{msg.sender === 'user' ? 'You' : 'EduNexus AI'} • {msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 rounded-2xl bg-white border border-slate-200/90 text-slate-500 text-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-medium text-slate-500">Copilot is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Starter Suggestions (Shown ONLY before the user has chatted) */}
          {!hasUserSentMessage && (
            <div className="px-4 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 shrink-0">
              <span className="w-full text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                Frequently asked:
              </span>
              {STARTER_PROMPTS.slice(0, 4).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-medium transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Chat Input */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about fees, QR attendance, CBSE marks, bus GPS..."
                className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-600/20 shrink-0 cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
