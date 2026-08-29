import React from 'react';
import {
  Cookie,
  Bot,
  Menu,
} from 'lucide-react';
import { type User } from '../types/database';
import { UserAccountSwitcher } from './UserAccountSwitcher';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
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
  onSelectUser,
  onOpenSignIn,
  onOpenSignUp,
  onLogout,
  onToggleSidebar,
}) => {
  return (
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-[#22093e] bg-[#070210]/95 backdrop-blur-md text-purple-100">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-[#d8b4fe] hover:text-white bg-[#140529] border border-[#7e22ce]/40 hover:border-[#a855f7] transition-all cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1e083e] text-[#e879f9] border border-[#9333ea]/50 flex items-center justify-center group-hover:scale-105 group-hover:border-[#c084fc] transition-all">
              <Cookie className="h-4 w-4 text-[#e879f9]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Crypticookie</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#ec4899] shadow-[0_0_6px_#ec4899]" />
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Account Switcher, AI Bot Access & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Account Switcher */}
          <UserAccountSwitcher
            currentUser={currentUser}
            onSelectUser={onSelectUser}
            onOpenSignIn={onOpenSignIn}
            onOpenSignUp={onOpenSignUp}
            onLogout={onLogout}
            compact
          />

          <button
            onClick={() => setActiveTab('ai_bot')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#140529] hover:bg-[#7e22ce] text-[#d8b4fe] hover:text-white text-xs font-semibold rounded-xl border border-[#7e22ce]/40 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm"
          >
            <Bot className="h-3.5 w-3.5 text-[#e879f9]" />
            <span className="hidden sm:inline">AI Privacy Bot</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#ec4899] animate-pulse" />
          </button>
        </div>
      </div>
    </header>
  );
};

