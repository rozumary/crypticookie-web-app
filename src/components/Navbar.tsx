import React from 'react';
import {
  Cookie,
  Bot,
  Menu,
  LogOut,
  Shield,
  Sparkles,
  Palette,
} from 'lucide-react';
import { type User } from '../types/database';
import { type AppTheme } from '../lib/theme';

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
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isDbReady,
  onToggleSidebar,
  theme = 'purple-poster',
  onToggleTheme,
}) => {
  const isPurple = theme === 'purple-poster';

  return (
    <header
      id="crypticookie-main-navbar"
      className={`sticky top-0 z-30 w-full border-b transition-colors duration-300 ${
        isPurple
          ? 'border-purple-900/60 bg-[#0e0624]/90 backdrop-blur-md shadow-lg shadow-purple-950/40'
          : 'border-violet-900/30 bg-[#070b19]/90 backdrop-blur-md'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isPurple
                  ? 'text-purple-200 hover:text-white bg-purple-950/60 border-purple-800/60 hover:bg-purple-900/70 hover:border-pink-500/60'
                  : 'text-blue-200 hover:text-white bg-blue-950/50 border-blue-900/50 hover:bg-blue-900/60 hover:border-violet-700/60'
              }`}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              isPurple
                ? 'bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-purple-600/30 group-hover:scale-105'
                : 'bg-gradient-to-br from-violet-600/30 to-blue-600/30 text-violet-300 border border-violet-500/40 shadow-violet-950/50 group-hover:scale-105'
            }`}>
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white tracking-tight uppercase font-poster">
                CRYPTICOOKIE
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isPurple
                  ? 'bg-purple-500/20 text-pink-300 border-purple-400/40'
                  : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
              }`}>
                {isPurple ? 'Science Fair' : 'Live v2'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Theme Revert Button, AI Bot Access & User profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Visual Theme Switcher & Revert Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-md active:scale-95 ${
                isPurple
                  ? 'bg-gradient-to-r from-purple-900/80 to-pink-900/80 hover:from-purple-800 hover:to-pink-800 text-pink-200 border-purple-400/50 shadow-purple-900/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-blue-200 border-slate-700 hover:border-violet-500'
              }`}
              title="Click to toggle between the Purple Poster Theme and Midnight Slate theme."
            >
              <Palette className={`h-3.5 w-3.5 ${isPurple ? 'text-pink-400' : 'text-blue-400'}`} />
              <span className="hidden sm:inline">
                {isPurple ? 'Purple UI (Active)' : 'Revert to Purple'}
              </span>
              <span className="sm:hidden text-[10px]">Theme</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('ai_bot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
              isPurple
                ? 'bg-gradient-to-r from-purple-950/80 to-pink-950/80 hover:from-purple-900 hover:to-pink-900 text-purple-200 border-purple-700/60 hover:border-pink-500'
                : 'bg-gradient-to-r from-violet-950/70 to-blue-950/70 hover:from-violet-900/80 hover:to-blue-900/80 text-violet-200 border-violet-700/50 hover:border-violet-500'
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-purple-400" />
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

