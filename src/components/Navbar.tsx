import React from 'react';
import {
  Cookie,
  Bot,
  Menu,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { type User } from '../types/database';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onLogout: () => void;
  onOneClickDemo: () => void;
  isDbReady: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isDbReady,
  onToggleSidebar,
}) => {
  return (
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-violet-900/30 bg-[#070b19]/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-blue-200 hover:text-white bg-blue-950/50 border border-blue-900/50 hover:bg-blue-900/60 hover:border-violet-700/60 transition-all cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 text-violet-300 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-950/50 group-hover:scale-105 group-hover:border-violet-400 transition-all">
              <Cookie className="h-4 w-4 text-violet-300" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight bg-gradient-to-r from-blue-100 via-violet-100 to-white bg-clip-text text-transparent">
                Crypticookie
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-300 text-[11px] font-mono border border-blue-500/30 rounded-md">
                <span className={`h-1.5 w-1.5 rounded-full ${isDbReady ? 'bg-blue-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>Backend Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: AI Bot Access & User profile if active */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('ai_bot')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-950/70 to-blue-950/70 hover:from-violet-900/80 hover:to-blue-900/80 text-violet-200 text-xs font-semibold rounded-xl border border-violet-700/50 hover:border-violet-500 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Bot className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">AI Privacy Bot</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 bg-[#0d1330] border border-violet-900/40 rounded-xl p-1.5 pl-3">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-blue-100 max-w-[120px] truncate">{currentUser.username}</span>
              <button
                id="btn-navbar-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1 hover:bg-violet-900/40 rounded text-violet-300 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
