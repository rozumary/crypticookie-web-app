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
import { ChromeProfileSelector } from './ChromeProfileSelector';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  activeProfileId?: string;
  onSelectProfile?: (profileId: string) => void;
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
  activeProfileId = 'profile_a',
  onSelectProfile,
  onLogout,
  isDbReady,
  onToggleSidebar,
}) => {
  return (
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-[#261445] bg-[#0A0414]/90 backdrop-blur-md text-purple-100">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-purple-300 hover:text-white bg-[#1A0935] border border-pink-500/30 hover:border-pink-500/60 transition-all cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1D0938] text-pink-400 border border-pink-500/30 flex items-center justify-center group-hover:scale-105 group-hover:border-pink-500/60 transition-all">
              <Cookie className="h-4 w-4 text-pink-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Crypticookie</span>
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Chrome Profile Selector, AI Bot Access & User profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onSelectProfile && (
            <ChromeProfileSelector
              activeProfileId={activeProfileId}
              onSelectProfile={onSelectProfile}
              compact
            />
          )}

          <button
            onClick={() => setActiveTab('ai_bot')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D0938] hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 text-pink-300 hover:text-white text-xs font-semibold rounded-xl border border-pink-500/40 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Bot className="h-3.5 w-3.5 text-pink-400" />
            <span className="hidden sm:inline">AI Privacy Bot</span>
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
          </button>

          {currentUser && (
            <div className="flex items-center gap-2 bg-[#170830] border border-pink-500/30 rounded-xl p-1.5 pl-3">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-[11px] flex items-center justify-center">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white max-w-[120px] truncate">{currentUser.username}</span>
              <button
                id="btn-navbar-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1 hover:bg-[#2B0E44] rounded-lg text-purple-300/70 hover:text-rose-400 transition-colors cursor-pointer"
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
