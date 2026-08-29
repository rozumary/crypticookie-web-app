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
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-[#B78AE8] bg-[#FFFFFF]/90 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-[#3B235C] hover:text-[#8B4ED8] bg-[#EDE1FF]/60 border border-[#B78AE8]/60 hover:bg-[#EDE1FF] transition-all cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#EDE1FF] text-[#8B4ED8] border border-[#B78AE8] flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
              <Cookie className="h-4 w-4 text-[#8B4ED8]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#3B235C] tracking-tight">
                Crypticookie
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: AI Bot Access & User profile if active */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('ai_bot')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EDE1FF] hover:bg-[#8B4ED8] text-[#8B4ED8] hover:text-white text-xs font-semibold rounded-xl border border-[#B78AE8] transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Privacy Bot</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 bg-[#FCFAFF] border border-[#B78AE8] rounded-xl p-1.5 pl-3 shadow-sm">
              <div className="h-6 w-6 rounded-lg bg-[#8B4ED8] text-white font-bold text-[11px] flex items-center justify-center shadow-sm">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-[#3B235C] max-w-[120px] truncate">{currentUser.username}</span>
              <button
                id="btn-navbar-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1 hover:bg-[#EDE1FF] rounded-lg text-[#6B528E] hover:text-rose-600 transition-colors cursor-pointer"
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
