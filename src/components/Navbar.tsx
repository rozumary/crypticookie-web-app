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
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md text-slate-200">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 group-hover:border-indigo-400/60 transition-all">
              <Cookie className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Crypticookie</span>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: AI Bot Access & User profile if active */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('ai_bot')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-200 text-xs font-semibold rounded-xl border border-indigo-500/40 transition-all cursor-pointer shadow-sm"
          >
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">AI Privacy Bot</span>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 pl-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white max-w-[120px] truncate">{currentUser.username}</span>
              <button
                id="btn-navbar-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
