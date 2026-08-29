import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  User,
  Copy,
  Check,
  HelpCircle,
  Lock,
  Globe,
  Cookie,
  Layers,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  {
    title: 'Why are scripts "Unverified"?',
    prompt:
      'Why does a website CMP script show as "Unverified" and how does SHA-256 hashing protect against tampering?',
    icon: ShieldAlert,
  },
  {
    title: 'Analyze Shopping Site Trackers',
    prompt:
      'What trackers and advertising pixels are typical on e-commerce sites like Shopee and Lazada, and how should I set my consent?',
    icon: Cookie,
  },
  {
    title: 'Explain Blockchain Ledgers',
    prompt:
      'How does Crypticookie use a hybrid dual-ledger (local Merkle proof + public Firestore chain) to prevent consent repudiation?',
    icon: Layers,
  },
  {
    title: 'Detecting Dark Patterns',
    prompt:
      'What are the most common deceptive dark patterns in cookie consent banners, and how does Crypticookie neutralize them?',
    icon: Zap,
  },
];

export const AIPrivacyBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        '👋 **Hello! I am Crypticookie AI**, your real-time privacy, cookie tracking, and blockchain consent advisor.\n\nYou can ask me to:\n- **Audit any website** for hidden trackers, advertising pixels, or session replay scripts.\n- **Explain SHA-256 script hashes** and CMP verification status (Whitelist vs Warning vs Unverified).\n- **Identify Dark Patterns** in cookie consent banners.\n- **Explain how the hybrid blockchain** stores cryptographic proof of your consent decisions.\n\nHow can I protect your privacy today?',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditDomain, setAuditDomain] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = textToSend || inputMessage;
    if (!message.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send chat request to backend Express Gemini API
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          history: historyPayload,
          context: auditDomain ? { targetDomain: auditDomain } : null,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const botReply: ChatMessage = {
        id: 'bot_' + Date.now(),
        role: 'model',
        content: data.reply || 'No response received from AI model.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback friendly guidance
      const fallbackReply: ChatMessage = {
        id: 'bot_fallback_' + Date.now(),
        role: 'model',
        content:
          `🛡️ **Crypticookie Privacy Assessment**:\n\n` +
          `Based on cryptographic integrity principles and web consent standards:\n` +
          `- **Script Verification**: When a website loads a CMP (like OneTrust or Cookiebot), Crypticookie computes its **SHA-256 cryptographic digest**. If the hash is not yet in the authorized registry, it is marked **Unverified** to alert you that the code could be modified or injected.\n` +
          `- **Recommended Consent Action**: For unverified or high-risk trackers, choose **"Reject Trackers"** or **"Customize"** to block non-essential third-party advertising cookies.\n` +
          `- **Blockchain Proof**: Every decision is committed as a cryptographic transaction block so websites cannot claim you opted in without your verified signature.`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuditWebsite = () => {
    if (!auditDomain.trim()) return;
    const clean = auditDomain
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();
    const prompt = `Please provide a thorough privacy & cookie audit for the domain "${clean}". What kinds of tracking pixels, analytics beacons, or third-party cookies does it commonly deploy, what dark patterns should users look out for on its consent banner, and what is your recommended consent setting?`;
    handleSendMessage(prompt);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content:
          '👋 **Chat session refreshed.** I am ready to analyze any website cookies, CMP script hashes, or blockchain audit questions!',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* SECTION 1: Top Header Outer Container */}
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
              CRYPTICOOKIE AI ADVISOR
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#180735] text-[#E879F9] border border-[#9333EA]/40 text-[11px] font-mono font-bold">
              <Sparkles className="h-3 w-3 text-[#E879F9]" />
              Gemini 2.5 Flash
            </span>
          </div>
          <p className="text-xs text-[#C084FC]/80 mt-1">
            Your AI assistant for checking website cookies, privacy policies, tracker safety, and consent choices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#180735] hover:bg-[#250B4E] text-purple-200 border border-[#9333EA]/40 text-xs font-semibold transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#E879F9]" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Main Grid Outer Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Quick Audit Tool & Suggested Questions */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Quick Domain Audit Outer Box */}
          <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 space-y-3 shadow-xl">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm mb-1">
              ASK AI TO AUDIT A SITE
            </div>
            <p className="text-[11px] text-[#C084FC]/80 leading-relaxed">
              Type any website domain to generate an instant AI privacy breakdown.
            </p>
            <div className="space-y-2.5 pt-1">
              <input
                type="text"
                value={auditDomain}
                onChange={(e) => setAuditDomain(e.target.value)}
                placeholder="e.g. shopee.ph, lazada.com, nytimes.com"
                className="w-full bg-[#130526] border border-[#391363] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 font-mono focus:outline-none focus:border-[#9333EA]"
                onKeyDown={(e) => e.key === 'Enter' && handleAuditWebsite()}
              />
              <button
                onClick={handleAuditWebsite}
                disabled={isLoading || !auditDomain.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Audit Domain</span>
              </button>
            </div>
          </div>

          {/* Quick Privacy Topics Outer Box */}
          <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 space-y-3 flex-1 flex flex-col justify-between shadow-xl">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm mb-1">
              QUICK PRIVACY TOPICS
            </div>
            <div className="space-y-2.5">
              {DEFAULT_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    disabled={isLoading}
                    className="w-full text-left p-3.5 rounded-2xl bg-[#130526] hover:bg-[#1C093E] border border-[#300E54] hover:border-[#9333EA]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 text-[#E879F9] mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-[11px] font-bold text-white group-hover:text-[#E879F9] transition-colors">
                          {item.title}
                        </div>
                        <p className="text-[10px] text-[#C084FC]/70 line-clamp-2 mt-0.5 leading-normal">
                          {item.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Chat Window Outer Box */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-[#391363] bg-[#0E041E] overflow-hidden h-[620px] max-h-[72vh] shadow-xl">
          {/* Chat Window Top Bar */}
          <div className="flex items-center justify-between border-b border-[#300E54] bg-[#100424] px-5 py-3.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#7E22CE] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Crypticookie Intelligence Engine
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active • Ready for Privacy Inquiries
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold text-[#C084FC]/70 hidden sm:inline">
                Encrypted Session
              </span>
              <Lock className="h-3.5 w-3.5 text-[#E879F9]" />
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-5 space-y-3.5 overflow-y-auto bg-[#070210]">
            {messages.map((m) => {
              const isBot = m.role === 'model';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    isBot ? 'justify-start' : 'justify-end'
                  } animate-fadeIn`}
                >
                  {isBot && (
                    <div className="h-8 w-8 rounded-xl bg-[#180735] border border-[#9333EA]/40 flex items-center justify-center text-[#E879F9] shrink-0 mt-0.5 shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isBot
                        ? 'bg-[#130526] border border-[#300E54] text-purple-100'
                        : 'bg-[#7E22CE] text-white shadow-md'
                    }`}
                  >
                    {/* Render message with linebreaks */}
                    <div className="whitespace-pre-wrap space-y-1 font-sans">
                      {m.content.split('\n').map((line, idx) => {
                        // Simple Markdown rendering for bold text and list markers
                        const formattedLine = line.replace(
                          /\*\*(.*?)\*\*/g,
                          '<strong>$1</strong>'
                        );
                        return (
                          <div
                            key={idx}
                            dangerouslySetInnerHTML={{ __html: formattedLine }}
                          />
                        );
                      })}
                    </div>

                    <div
                      className={`flex items-center justify-between gap-4 mt-2.5 pt-2 border-t text-[10px] font-mono ${
                        isBot
                          ? 'border-[#300E54] text-[#C084FC]/70'
                          : 'border-white/20 text-purple-100'
                      }`}
                    >
                      <span>{m.timestamp}</span>
                      {isBot && (
                        <button
                          onClick={() => handleCopy(m.content, m.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer font-bold text-[#E879F9]"
                          title="Copy response"
                        >
                          {copiedId === m.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!isBot && (
                    <div className="h-8 w-8 rounded-xl bg-[#180735] border border-[#9333EA]/40 flex items-center justify-center text-[#E879F9] shrink-0 mt-0.5 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Action Suggestion Cards inside Chat to fill empty canvas space */}
            {messages.length <= 1 && (
              <div className="mt-3 pt-3 border-t border-[#300E54]/60 space-y-2.5">
                <div className="text-[11px] font-bold text-[#C084FC]/80 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#E879F9]" />
                  <span>Explore Suggested Privacy Audits & Topics</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEFAULT_SUGGESTIONS.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s.prompt)}
                        disabled={isLoading}
                        className="text-left p-3 rounded-2xl bg-[#130526] hover:bg-[#1C093E] border border-[#300E54] hover:border-[#9333EA]/50 transition-all cursor-pointer group flex items-start gap-2.5"
                      >
                        <div className="h-7 w-7 rounded-lg bg-[#180735] border border-[#9333EA]/40 flex items-center justify-center shrink-0 text-[#E879F9] group-hover:scale-105 transition-transform">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-white group-hover:text-[#E879F9] transition-colors">
                            {s.title}
                          </div>
                          <p className="text-[10px] text-[#C084FC]/70 line-clamp-2 mt-0.5">
                            {s.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-[#180735] border border-[#9333EA]/40 flex items-center justify-center text-[#E879F9] shrink-0">
                  <Bot className="h-4 w-4 animate-spin text-[#E879F9]" />
                </div>
                <div className="rounded-2xl bg-[#130526] border border-[#300E54] p-4 text-xs text-[#D8B4FE] font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#E879F9] animate-ping" />
                  <span>
                    Crypticookie AI is analyzing privacy policies & cryptographic rules...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="border-t border-[#300E54] bg-[#100424] p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything about website cookies, CMP script hashes, dark patterns, or privacy laws..."
                className="flex-1 bg-[#180735] border border-[#3E1568] rounded-xl px-4 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-[#9333EA]"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shadow-md"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
