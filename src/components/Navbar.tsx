import React from 'react';
import {
  Cookie,
  Code2,
  UserCheck,
  LogOut,
  Sparkles,
  Menu,
  UserPlus,
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
  onOpenSignIn,
  onOpenSignUp,
  onLogout,
  onOneClickDemo,
  isDbReady,
  onToggleSidebar,
}) => {
  return (
    <header id="crypticookie-main-navbar" className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#0b1120]/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Left Side: Sidebar Toggle & Cookie Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="btn-navbar-toggle-sidebar"
              onClick={onToggleSidebar}
              title="Toggle Sidebar"
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div 
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Cookie className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                Crypticookie
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20 rounded-md">
                <span className={`h-1.5 w-1.5 rounded-full ${isDbReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>Backend Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Extension Download & Clear Sign In / Sign Up Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setActiveTab('extension_source')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Extension ZIP</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 pl-3">
              <div className="h-6 w-6 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-200">{currentUser.username}</span>
              <button
                id="btn-navbar-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-navbar-signin"
                onClick={onOpenSignIn}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                id="btn-navbar-signup"
                onClick={onOpenSignUp}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
