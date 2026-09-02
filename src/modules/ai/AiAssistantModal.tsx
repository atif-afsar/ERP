import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  CalendarCheck,
  CreditCard,
  Award,
  BookOpen,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const { currentTenant, getLabel, isSchool } = useTenant();
  const { currentUser, isParent, activeStudentId } = useAuth();

  const students = storage.getStudents(currentTenant.id);
  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];
  const feeLedger = storage.getStudentLedger(activeStudent?.id);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am your EduNexus AI Assistant for ${currentTenant.name}. You can ask me about ${activeStudent ? `${activeStudent.firstName}'s` : 'student'} fee dues, attendance records, upcoming exams, or timetables.`,
      timestamp: 'Just now',
    },
  ]);

  const handleSend = (textToSend?: string) => {
    const userText = textToSend || input;
    if (!userText.trim()) return;

    const newMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('fee') || lower.includes('due') || lower.includes('pay')) {
        reply = `${activeStudent?.firstName} has a remaining fee due of ₹${feeLedger?.dueAmount?.toLocaleString() || '0'}. The next installment is due on ${feeLedger?.dueDate || '30th September 2026'}. You can pay directly via Razorpay UPI in the Fees module.`;
      } else if (lower.includes('attendance') || lower.includes('present') || lower.includes('absent')) {
        reply = `${activeStudent?.firstName}'s attendance rate for this semester is 94.2% (49 of 52 days attended). Today's entry was verified via campus QR gate at 08:15 AM.`;
      } else if (lower.includes('exam') || lower.includes('test') || lower.includes('score') || lower.includes('result')) {
        reply = isSchool
          ? `${activeStudent?.firstName} scored 89.75% (Rank #3 in class) in the Half-Yearly Examinations with Grade A1 in Mathematics (96%) and Science (91%).`
          : `${activeStudent?.firstName} scored 259/300 (86.33%, Rank #4) in All-India Mock Test #4. Best performance in Advanced Calculus.`;
      } else if (lower.includes('timetable') || lower.includes('class') || lower.includes('schedule')) {
        reply = `Today's schedule includes Physics at 08:30 AM (Room 201), Mathematics at 09:15 AM, and English at 10:15 AM.`;
      } else {
        reply = `I have logged your query. Based on ${currentTenant.name}'s records, ${activeStudent?.firstName} is actively enrolled with excellent standing. Feel free to ask about fees, attendance, results, or homework!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 800);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="EduNexus AI WhatsApp & Portal Assistant"
      subtitle={`Authenticated for ${currentTenant.name} • Tenant Context: ${currentTenant.code}`}
      maxWidth="lg"
    >
      <div className="flex flex-col h-[520px]">
        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`p-2 rounded-xl text-white ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 shadow-md shadow-sky-600/20'
                    : 'bg-purple-600 shadow-md shadow-purple-600/20'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-amber-300" />}
              </div>

              <div
                className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-sky-600/20 border border-sky-500/30 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
                <span className="block text-[9px] text-slate-400 mt-1 text-right">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800">
          <button
            onClick={() => handleSend("What are my child's pending fee dues?")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] whitespace-nowrap border border-slate-800"
          >
            💳 Pending Fees?
          </button>
          <button
            onClick={() => handleSend("What is today's attendance status?")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] whitespace-nowrap border border-slate-800"
          >
            📋 Today's Attendance?
          </button>
          <button
            onClick={() => handleSend("Show latest exam scores and rank")}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-[11px] whitespace-nowrap border border-slate-800"
          >
            🏆 Latest Results?
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="pt-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${activeStudent ? activeStudent.firstName : 'institution'}...`}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <Button type="submit" variant="primary" size="md">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Modal>
  );
};
