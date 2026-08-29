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
  ExternalLink,
  HelpCircle,
  Lock,
  Globe,
  Cookie,
  Layers,
  ArrowRight,
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
    prompt: 'Why does a website CMP script show as "Unverified" and how does SHA-256 hashing protect against tampering?',
    icon: ShieldAlert,
  },
  {
    title: 'Analyze Shopping Site Trackers',
    prompt: 'What trackers and advertising pixels are typical on e-commerce sites like Shopee and Lazada, and how should I set my consent?',
    icon: Cookie,
  },
  {
    title: 'Explain Blockchain Ledgers',
    prompt: 'How does Crypticookie use a hybrid dual-ledger (local Merkle proof + public Firestore chain) to prevent consent repudiation?',
    icon: Layers,
  },
  {
    title: 'Detecting Dark Patterns',
    prompt: 'What are the most common deceptive dark patterns in cookie consent banners, and how does Crypticookie neutralize them?',
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuditWebsite = () => {
    if (!auditDomain.trim()) return;
    const clean = auditDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Outer Container */}
      <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-purple-950/20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Bot className="h-6 w-6 text-pink-400" />
              <span>Smart Privacy Assistant</span>
            </h1>
            <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#1A0935] text-pink-300 border border-pink-500/30 text-[11px] font-mono font-bold">
              <Sparkles className="h-3 w-3 text-pink-400" />
              AI Powered
            </span>
          </div>
          <p className="text-xs text-purple-300/80 mt-1">
            Your friendly assistant for explaining cookie banners, checking website safety, detecting sneaky popups, and protecting your data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-purple-200 border border-pink-500/30 text-xs font-semibold transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5 text-pink-300" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Main Grid Outer Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Quick Audit Tool & Suggested Questions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Domain Audit Outer Box */}
          <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-5 space-y-3 shadow-lg shadow-purple-950/20">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Globe className="h-4 w-4 text-pink-400" />
              <span>Check Any Website</span>
            </div>
            <p className="text-[11px] text-purple-300/80">
              Type any website name to see what tracking cookies it uses.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={auditDomain}
                onChange={(e) => setAuditDomain(e.target.value)}
                placeholder="e.g. shopee.ph, amazon.com"
                className="w-full bg-[#170A30] border border-[#301659] rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-purple-400/40 font-mono focus:outline-none focus:border-pink-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAuditWebsite()}
              />
              <button
                onClick={handleAuditWebsite}
                disabled={isLoading || !auditDomain.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-pink-950/30"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Check Website Safety</span>
              </button>
            </div>
          </div>

          {/* Quick Privacy Topics Outer Box */}
          <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-5 space-y-3 shadow-lg shadow-purple-950/20">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <HelpCircle className="h-4 w-4 text-pink-400" />
              <span>Popular Questions</span>
            </div>
            <div className="space-y-2">
              {DEFAULT_SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    disabled={isLoading}
                    className="w-full text-left p-2.5 rounded-xl bg-[#1B0D38] hover:bg-[#251048] border border-[#33185E] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 text-pink-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {item.title}
                        </div>
                        <p className="text-[10px] text-purple-300/70 line-clamp-2 mt-0.5">
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
        <div className="lg:col-span-3 flex flex-col rounded-3xl border border-[#3D1E6D] bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] overflow-hidden min-h-[560px] shadow-lg shadow-purple-950/20">
          {/* Chat Window Top Bar */}
          <div className="flex items-center justify-between border-b border-[#33185E] bg-[#1B0D38] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Privacy Advisor Chat</h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online • Ready to Answer Your Questions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-purple-300/80 hidden sm:inline">
                Private & Secure
              </span>
              <Lock className="h-3.5 w-3.5 text-pink-400" />
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[500px] bg-[#14082B]">
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
                    <div className="h-8 w-8 rounded-xl bg-[#1A0935] border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isBot
                        ? 'bg-[#1D0C3C] border border-[#33185E] text-purple-100'
                        : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    }`}
                  >
                    {/* Render message with linebreaks */}
                    <div className="whitespace-pre-wrap space-y-1 font-sans">
                      {m.content.split('\n').map((line, idx) => {
                        // Simple Markdown rendering for bold text and list markers
                        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return (
                          <div
                            key={idx}
                            dangerouslySetInnerHTML={{ __html: formattedLine }}
                          />
                        );
                      })}
                    </div>

                    <div className={`flex items-center justify-between gap-4 mt-2.5 pt-2 border-t text-[10px] font-mono ${
                      isBot ? 'border-[#33185E] text-purple-300/70' : 'border-white/20 text-purple-100'
                    }`}>
                      <span>{m.timestamp}</span>
                      {isBot && (
                        <button
                          onClick={() => handleCopy(m.content, m.id)}
                          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer font-bold text-pink-300"
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
                    <div className="h-8 w-8 rounded-xl bg-[#1A0935] border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-pulse">
                <div className="h-8 w-8 rounded-xl bg-[#1A0935] border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0">
                  <Bot className="h-4 w-4 animate-spin text-pink-400" />
                </div>
                <div className="rounded-2xl bg-[#1D0C3C] border border-[#33185E] p-4 text-xs text-purple-300 font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pink-400 animate-ping" />
                  <span>Checking website rules and privacy standards...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="border-t border-[#33185E] bg-[#1B0D38] p-4">
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
                placeholder="Ask any question about website cookies, privacy, or tracking banners..."
                className="flex-1 bg-[#14082B] border border-[#301659] rounded-xl px-4 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-pink-950/30"
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
