import React, { useEffect, useRef, useState } from 'react';
import { PageId } from '../types';
import { fetchChatHistory, sendChatMessage } from '../lib/api';
import { Bot, Send, User, Sparkles } from 'lucide-react';

interface ChatAssistantProps {
  onNavigate: (page: PageId) => void;
}

export default function ChatAssistant({ onNavigate }: ChatAssistantProps) {
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string; id?: string | number }>
  >([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory()
      .then((history) => {
        const flat = history
          .slice()
          .reverse()
          .flatMap((m) => [
            { role: 'user' as const, content: m.user_message, id: m.id },
            { role: 'assistant' as const, content: m.ai_response, id: m.id },
          ]);
        setMessages(flat);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(userMsg);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.ai_response, id: res.id }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'How can I improve my resume for ATS?',
    'What skills should I learn for my target role?',
    'Recommend jobs based on my resume',
    'Help me prepare for a technical interview',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <div className="w-12 h-[1px] bg-white mb-3" />
        <h2 className="font-serif text-3xl font-light text-white mb-2 flex items-center gap-3">
          <Sparkles size={24} className="text-white/60" />
          AI Career Assistant
        </h2>
        <p className="text-sm text-[#A3A3A3]">
          Ask about resume improvements, career guidance, skills, interviews, and job recommendations.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <Bot size={40} className="mx-auto text-white/20" />
              <p className="text-sm text-[#A3A3A3]">Start a conversation with CVAlign AI</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-white text-black'
                    : 'bg-white/[0.06] text-[#E5E5E5] border border-white/[0.08]'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User size={14} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Bot size={14} className="animate-pulse" />
              </div>
              <div className="bg-white/[0.06] rounded-lg px-4 py-3 text-sm text-white/40">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-6 pb-2 text-xs text-[#EF4444]">{error}</div>
        )}

        <form onSubmit={handleSend} className="p-4 border-t border-white/[0.08] flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your resume, career, or jobs..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-white text-black px-4 py-3 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => onNavigate('analyze')}
        className="text-xs text-white/40 hover:text-white underline"
      >
        Haven&apos;t analyzed a resume yet? Upload one first →
      </button>
    </div>
  );
}
