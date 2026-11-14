import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronDown,
  Minimize2,
  Maximize2,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';
import { useLanguage } from '../context/LanguageContext.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AICopilotProps {
  currentUser: AuthUser | null;
  currentPageContext: string;
  contextDetails?: Record<string, unknown>;
  onOpenPricing?: () => void;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  isOpenControlled?: boolean;
  onToggleOpen?: (open: boolean) => void;
  externalTriggerPrompt?: string | null;
}

export const AICopilot: React.FC<AICopilotProps> = ({
  currentUser,
  currentPageContext,
  contextDetails = {},
  onOpenPricing,
  onOpenAuth,
  isOpenControlled,
  onToggleOpen,
  externalTriggerPrompt,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const setIsOpen = (val: boolean) => {
    setInternalOpen(val);
    if (onToggleOpen) onToggleOpen(val);
  };
  const { currentLocale } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: currentUser
        ? `Hello **${currentUser.fullName}**! I'm **ApplyVise Copilot**, your career strategist. How can I assist your job search today?`
        : `Welcome! I'm **ApplyVise Copilot**. Sign in to get context-aware career guidance, interview coaching, and ATS resume optimization!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Load subscription usage & conversation history on open
  useEffect(() => {
    if (isOpen && currentUser) {
      api.getSubscription()
        .then(res => {
          if (res.success && res.usage) {
            setUsage(res.usage);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (externalTriggerPrompt) {
      setIsOpen(true);
      handleSendMessage(externalTriggerPrompt);
    }
  }, [externalTriggerPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    if (!currentUser) {
      if (onOpenAuth) onOpenAuth('signup');
      return;
    }

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await api.askCopilot(text, {
        page: currentPageContext,
        details: contextDetails,
        preferredLocale: currentLocale,
      });

      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (res.usage) {
        setUsage(res.usage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      const errorResponse: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Notice:** ${msg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Context-specific suggestion chips
  const getSuggestions = () => {
    switch (currentPageContext) {
      case 'jobs':
        return [
          'Analyze key requirements for live vacancies',
          'How does Assisted Apply work vs Auto-Apply?',
          'What skills are trending for remote tech roles?',
        ];
      case 'applications':
        return [
          'Draft a follow-up email for a submitted application',
          'Key behavioral interview questions to prepare',
          'How to follow up 7 days after submission',
        ];
      case 'profile':
        return [
          'How to make my professional summary punchier',
          'Best practices for listing quantifiable achievements',
          'How does truthfulness scoring work?',
        ];
      default:
        return [
          'How does ApplyVise AI ATS tailoring work?',
          'Tell me about Free vs Pro plan benefits',
          'Give me top 3 interview preparation tips',
        ];
    }
  };

  return (
    <>
      {/* Floating Copilot Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center space-x-2.5 px-4 py-3 min-h-[44px] rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 transition-all duration-300 hover:scale-[1.03] group border border-slate-700/80 touch-target"
          aria-label="Open ApplyVise Copilot"
        >
          <div className="relative">
            <BrandLogo size="xs" showWordmark={false} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9483E8] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#9483E8]"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-tight text-white">AI Copilot</span>
          <span className="px-1.5 py-0.2 rounded-md bg-[rgba(148,131,232,0.15)] text-[#9483E8] border border-[rgba(148,131,232,0.30)] text-[10px] font-mono font-semibold">
            {usage?.remaining !== undefined ? `${usage.remaining} left` : 'AI'}
          </span>
        </button>
      )}

      {/* Expanded Copilot Drawer / Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden ${
            isMinimized
              ? 'bottom-20 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] max-w-sm sm:w-[420px] h-14 rounded-2xl'
              : 'inset-x-3 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] max-h-[calc(100vh-6rem)] sm:max-h-[85vh] h-[580px] rounded-2xl sm:rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center space-x-2.5">
              <BrandLogo size="xs" showWordmark={false} />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold tracking-tight">ApplyVise Copilot</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    AI 2.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Context: {currentPageContext.toUpperCase()}</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quota Banner */}
              {currentUser && usage && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-medium text-slate-700">Monthly AI Quota:</span>
                    {isPermanentFreeAccessAccount(currentUser) ? (
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {usage.used} queries (Permanent Unlimited Access)
                      </span>
                    ) : (
                      <span className="font-bold text-slate-900">{usage.used} / {usage.limit}</span>
                    )}
                  </div>
                  {!isPermanentFreeAccessAccount(currentUser) && usage.limit <= 10 && onOpenPricing && (
                    <button
                      onClick={onOpenPricing}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                    >
                      <span>Upgrade for 300</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center space-x-2 p-3.5 rounded-2xl bg-slate-100 max-w-[70%] text-slate-500 rounded-bl-xs">
                    <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                    <span className="text-[11px] font-medium">Copilot is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Action Chips */}
              <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
                {getSuggestions().map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isLoading}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder={
                    currentUser
                      ? `Ask Copilot about ${currentPageContext}...`
                      : 'Sign in to chat with AI Copilot...'
                  }
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};
