import React from 'react';
import {
  Activity,
  Shield,
  Layers,
  FileCheck,
  Settings as SettingsIcon,
  Bot,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserPlus,
  LogOut,
  Sparkles,
  Cookie,
} from 'lucide-react';
import { type User } from '../types/database';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentUser: User | null;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onLogout: () => void;
  onOneClickDemo: () => void;
  isDbReady: boolean;
  metrics: {
    totalLedgerBlocks: number;
    whitelistedCMPs: number;
    blacklistedCMPs: number;
    threatsBlockedCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  currentUser,
  onOpenSignIn,
  onOpenSignUp,
  onLogout,
  onOneClickDemo,
  isDbReady,
  metrics,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
    },
    {
      id: 'simulator',
      label: 'Extension Simulator',
      icon: Shield,
    },
    {
      id: 'blockchain',
      label: 'Blockchain Explorer',
      icon: Layers,
    },
    {
      id: 'cmp_registry',
      label: 'CMP Registry',
      icon: FileCheck,
    },
    {
      id: 'ai_bot',
      label: 'AI Privacy Bot',
      icon: Bot,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside
        id="crypticookie-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-[#261445] bg-[#0A0414] text-purple-200 transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18 w-64' : 'w-64'}`}
      >
        {/* Sidebar Header / Cookie Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#261445] px-4 bg-[#110724]">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
          >
            <div className="w-8 h-8 shrink-0 bg-[#1D0938] border border-pink-500/30 rounded-xl flex items-center justify-center text-pink-400 group-hover:scale-105 group-hover:border-pink-500/60 transition-all">
              <Cookie className="h-4 w-4 text-pink-400" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Crypticookie</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                </span>
                <span className="text-[10px] text-purple-300/60 font-medium">
                  Crypticookie
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            id="btn-sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-[#1F0A38] hover:border hover:border-pink-500/30 transition-all cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            id="btn-sidebar-mobile-close"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-[#1F0A38]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
                className={`group relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2B0A42] via-[#200835] to-[#350C48] text-white border border-pink-500/50'
                    : 'text-purple-300/80 hover:text-white border border-transparent hover:border-purple-500/30 hover:bg-[#18092C]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-pink-400' : 'text-purple-400/70 group-hover:text-pink-400'
                  }`}
                />
                {(!isCollapsed || isOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && (!isCollapsed || isOpen) && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-[#261445] p-3 bg-[#110724] space-y-2">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#1A0935] border border-pink-500/30 p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 border border-pink-400/40 flex items-center justify-center text-white font-bold text-xs">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                {(!isCollapsed || isOpen) && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white block truncate">{currentUser.username}</span>
                    <span className="text-[10px] text-purple-300/60 block truncate">{currentUser.email}</span>
                  </div>
                )}
              </div>

              {(!isCollapsed || isOpen) && (
                <button
                  id="btn-sidebar-logout"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-purple-300/70 hover:text-rose-400 hover:bg-[#2B0E44] rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {(!isCollapsed || isOpen) ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      id="btn-sidebar-sign-in"
                      onClick={onOpenSignIn}
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-[#1D0938] hover:bg-[#2B0E46] border border-pink-500/30 text-xs font-semibold text-purple-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      id="btn-sidebar-sign-up"
                      onClick={onOpenSignUp}
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                  <button
                    id="btn-sidebar-one-click-demo"
                    onClick={onOneClickDemo}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1D0938] hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 hover:text-white border border-pink-500/30 py-1.5 text-xs font-semibold text-pink-300 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                    <span>Demo Login</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-sidebar-collapsed-login"
                  onClick={onOpenSignIn}
                  title="Sign In"
                  className="w-full flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
