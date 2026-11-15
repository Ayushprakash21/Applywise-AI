import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  ArrowRight,
  Sparkles,
  Bot
} from 'lucide-react';
import { api, AuthUser } from '../services/api.ts';
import { isPermanentFreeAccessAccount } from '../config/freeAccess.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LeoAvatar } from './leo/LeoAvatar.tsx';
import { LeoCharacter, LeoState } from './leo/LeoCharacter.tsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AICopilotProps {
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
  
  // Leo mascot reaction state
  const [leoState, setLeoState] = useState<LeoState>('idle');
  const [isHoveredLauncher, setIsHoveredLauncher] = useState(false);
  const [isClickingPaw, setIsClickingPaw] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: currentUser
        ? `Hey! I'm Leo. 🐾\n\nI can help you discover opportunities, improve your resume, prepare for interviews and navigate your career journey.\n\nWhat shall we work on today?`
        : `Hey! I'm Leo. 🐾\n\nI can help you discover opportunities, improve your resume, prepare for interviews and navigate your career journey.\n\nWhat shall we work on today?`,
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

  // Handler for opening with paw greeting
  const handleLauncherClick = () => {
    setIsClickingPaw(true);
    setLeoState('greeting');
    setTimeout(() => {
      setIsClickingPaw(false);
      setIsOpen(true);
      setLeoState('idle');
    }, 280);
  };

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
    setLeoState('thinking');

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
      setLeoState('responding');
      setTimeout(() => {
        setLeoState('idle');
      }, 3500);

      if (res.usage) {
        setUsage(res.usage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setLeoState('error');
      const errorResponse: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Notice:** ${msg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorResponse]);
      setTimeout(() => {
        setLeoState('idle');
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Context-specific suggestion chips for Leo
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
          'How does ApplyWise AI ATS tailoring work?',
          'Tell me about Free vs Pro plan benefits',
          'Give me top 3 interview preparation tips',
        ];
    }
  };

  return (
    <>
      {/* Floating Leo Launcher Button */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 group">
          {/* Tooltip: Talk to Leo */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/90 text-white text-[11px] font-medium rounded-lg shadow-xl border border-slate-700/80 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap backdrop-blur-xs flex items-center space-x-1">
            <span>Talk to Leo</span>
            <span className="text-amber-400">🐾</span>
          </div>

          <button
            onClick={handleLauncherClick}
            onMouseEnter={() => {
              setIsHoveredLauncher(true);
              setLeoState('greeting');
            }}
            onMouseLeave={() => {
              setIsHoveredLauncher(false);
              setLeoState('idle');
            }}
            className="flex items-center space-x-2.5 pl-2 pr-4 py-2 min-h-[44px] rounded-full bg-slate-900 text-white shadow-2xl hover:bg-slate-800 transition-all duration-300 hover:scale-[1.03] border border-slate-700/80 touch-target focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="Open ApplyVise Copilot"
            title="Talk to Leo"
          >
            {/* Leo Animated Mascot Avatar */}
            <div className="relative -my-1">
              <LeoCharacter
                state={isClickingPaw ? 'greeting' : isHoveredLauncher ? 'greeting' : 'idle'}
                size={40}
                interactive={true}
                showPaw={true}
                showTail={false}
                showCollar={true}
              />
              {/* Subtle Availability Indicator */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-slate-900"></span>
              </span>
            </div>

            {/* Leo Name Label */}
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs font-bold tracking-tight text-white flex items-center space-x-1">
                <span>Leo</span>
              </span>
            </div>

            {/* Availability / Quota Pill */}
            <span className="px-1.5 py-0.5 rounded-md bg-[rgba(148,131,232,0.15)] text-[#9483E8] border border-[rgba(148,131,232,0.30)] text-[10px] font-mono font-semibold">
              {usage?.remaining !== undefined ? `${usage.remaining} left` : 'AI'}
            </span>
          </button>
        </div>
      )}

      {/* Expanded Leo Chat Drawer / Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden ${
            isMinimized
              ? 'bottom-20 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] max-w-sm sm:w-[420px] h-14 rounded-2xl'
              : 'inset-x-3 bottom-20 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] max-h-[calc(100vh-6rem)] sm:max-h-[85vh] h-[580px] rounded-2xl sm:rounded-3xl'
          }`}
          role="dialog"
          aria-label="Leo — Your Career Companion"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 select-none border-b border-slate-800">
            <div className="flex items-center space-x-3">
              {/* Animated Leo Avatar in Header */}
              <div className="relative">
                <LeoAvatar
                  state={leoState}
                  size={42}
                  interactive={true}
                  showStatusIndicator={true}
                  status={isLoading ? 'thinking' : 'online'}
                />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold tracking-tight text-white flex items-center space-x-1">
                    <span>Leo</span>
                    <span className="text-amber-400 text-xs">🐾</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Career Assistant
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Your ApplyWise Career Companion</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label={isMinimized ? 'Expand Leo chat' : 'Minimize Leo chat'}
              >
                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Close"
                aria-label="Close Leo chat"
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
                    <div className="flex items-end space-x-2 max-w-[92%]">
                      {m.role === 'assistant' && (
                        <div className="shrink-0 mb-1">
                          <LeoCharacter
                            state={m.id === 'welcome' ? 'idle' : 'responding'}
                            size={28}
                            interactive={false}
                            showPaw={false}
                            showTail={false}
                            showCollar={true}
                          />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3.5 leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* Leo is thinking state */}
                {isLoading && (
                  <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-100 max-w-[75%] text-slate-600 rounded-bl-xs border border-slate-200/60">
                    <LeoCharacter
                      state="thinking"
                      size={28}
                      interactive={false}
                      showPaw={false}
                      showTail={false}
                      showCollar={true}
                    />
                    <div className="flex items-center space-x-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-[11px] font-medium">Leo is thinking...</span>
                    </div>
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
                      ? `Ask Leo about ${currentPageContext}...`
                      : 'Sign in to chat with Leo...'
                  }
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition"
                  aria-label="Send message to Leo"
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

// Aliases for clean adoption
export const Leo = AICopilot;
