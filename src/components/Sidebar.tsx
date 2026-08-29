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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-violet-900/30 bg-[#070b19] transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18 w-64' : 'w-64'}`}
      >
        {/* Sidebar Header / Cookie Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-violet-900/30 px-4 bg-gradient-to-b from-violet-950/20 to-transparent">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
          >
            <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/40 rounded-xl flex items-center justify-center text-violet-300 shadow-md shadow-violet-950/40 group-hover:scale-105 group-hover:border-violet-400 transition-all">
              <Cookie className="h-4 w-4 text-violet-300" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight bg-gradient-to-r from-blue-100 via-violet-100 to-white bg-clip-text text-transparent">
                  Crypticookie
                </span>
                <span className="text-[10px] text-blue-300/70">
                  Consent System
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            id="btn-sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-violet-900/30 border border-transparent hover:border-violet-800/40 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            id="btn-sidebar-mobile-close"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-violet-900/30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/25 to-blue-600/15 text-white font-semibold border border-violet-500/40 shadow-sm shadow-violet-950/50'
                    : 'text-blue-200/70 hover:bg-violet-950/40 hover:text-white border border-transparent hover:border-violet-900/30'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-violet-400' : 'text-blue-400/70 group-hover:text-violet-300'
                  }`}
                />
                {(!isCollapsed || isOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && (!isCollapsed || isOpen) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-violet-900/30 p-3 bg-[#060914] space-y-2">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-violet-950/40 border border-violet-900/40 p-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 border border-violet-400/30 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                {(!isCollapsed || isOpen) && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-blue-100 block truncate">{currentUser.username}</span>
                    <span className="text-[10px] text-blue-300/60 block truncate">{currentUser.email}</span>
                  </div>
                )}
              </div>

              {(!isCollapsed || isOpen) && (
                <button
                  id="btn-sidebar-logout"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-blue-300 hover:text-rose-400 hover:bg-violet-900/40 rounded-lg transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/40 text-xs font-medium text-blue-200 transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      id="btn-sidebar-sign-up"
                      onClick={onOpenSignUp}
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white transition-all shadow-sm shadow-violet-950/60 cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                  <button
                    id="btn-sidebar-one-click-demo"
                    onClick={onOneClickDemo}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 py-1.5 text-xs font-semibold text-violet-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Demo Login</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-sidebar-collapsed-login"
                  onClick={onOpenSignIn}
                  title="Sign In"
                  className="w-full flex items-center justify-center p-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white cursor-pointer"
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
