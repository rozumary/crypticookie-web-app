import React from 'react';
import {
  Activity,
  Shield,
  Layers,
  FileCheck,
  Terminal,
  Code2,
  Database,
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
      id: 'analytics',
      label: 'Evaluation Matrices',
      icon: Terminal,
    },
    {
      id: 'extension_source',
      label: 'Extension Source',
      icon: Code2,
    },
    {
      id: 'database',
      label: 'Database Console',
      icon: Database,
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside
        id="crypticookie-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-[#0b1120] transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18 w-64' : 'w-64'}`}
      >
        {/* Sidebar Header / Cookie Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-4">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
          >
            <div className="w-8 h-8 shrink-0 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-105 transition-transform">
              <Cookie className="h-4 w-4" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight">
                  Crypticookie
                </span>
                <span className="text-[10px] text-slate-400">
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
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            id="btn-sidebar-mobile-close"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={item.label}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {(!isCollapsed || isOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-slate-800/80 p-3 bg-slate-950/40">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/80 border border-slate-800 p-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                {(!isCollapsed || isOpen) && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white block truncate">{currentUser.username}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{currentUser.email}</span>
                  </div>
                )}
              </div>

              {(!isCollapsed || isOpen) && (
                <button
                  id="btn-sidebar-logout"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      id="btn-sidebar-sign-up"
                      onClick={onOpenSignUp}
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                  <button
                    id="btn-sidebar-one-click-demo"
                    onClick={onOneClickDemo}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 py-1.5 text-xs font-semibold text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Demo Login</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-sidebar-collapsed-login"
                  onClick={onOpenSignIn}
                  title="Sign In"
                  className="w-full flex items-center justify-center p-2 rounded-xl bg-indigo-600 text-white cursor-pointer"
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
