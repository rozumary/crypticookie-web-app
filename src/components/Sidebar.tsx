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
  LogOut,
  Sparkles,
  Cookie,
  Palette,
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
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside
        id="crypticookie-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-[#22093e] bg-[#070210] text-purple-200 transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-18 w-64' : 'w-64'}`}
      >
        {/* Sidebar Header / Cookie Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#22093e] px-4 bg-[#0a0316]">
          <div
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
          >
            <div className="w-8 h-8 shrink-0 bg-[#1e083e] border border-[#9333ea]/50 rounded-xl flex items-center justify-center text-[#d8b4fe] group-hover:scale-105 group-hover:border-[#c084fc] transition-all">
              <Cookie className="h-4 w-4 text-[#e879f9]" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>Crypticookie</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ec4899] shadow-[0_0_6px_#ec4899]" />
                </span>
                <span className="text-[10px] text-[#c084fc]/70 font-medium">
                  Consent Shield
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse / Expand Button */}
          <button
            id="btn-sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-[#1a0636] hover:border hover:border-[#9333ea]/40 transition-all cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            id="btn-sidebar-mobile-close"
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-purple-300/70 hover:text-white hover:bg-[#1a0636]"
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
                    ? 'bg-[#1a0636] text-white border border-[#9333ea]/80 shadow-[0_0_12px_rgba(147,51,234,0.25)]'
                    : 'text-[#d8b4fe]/80 hover:text-white border border-transparent hover:border-[#6b21a8]/40 hover:bg-[#120426]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#e879f9]' : 'text-[#a855f7] group-hover:text-[#e879f9]'
                  }`}
                />
                {(!isCollapsed || isOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && (!isCollapsed || isOpen) && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#ec4899] shadow-[0_0_10px_#ec4899] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Card & Theme Badge */}
        <div className="border-t border-[#22093e] p-3 bg-[#0a0316] space-y-2.5">
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#0f041e] border border-[#300e57] p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-xl bg-[#6b21a8] border border-[#a855f7]/50 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                {(!isCollapsed || isOpen) && (
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-white block truncate">{currentUser.username}</span>
                    <span className="text-[10px] text-[#c084fc]/70 block truncate">{currentUser.email}</span>
                  </div>
                )}
              </div>

              {(!isCollapsed || isOpen) && (
                <button
                  id="btn-sidebar-logout"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-purple-300/70 hover:text-rose-400 hover:bg-[#1a0636] rounded-xl transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-[#140529] hover:bg-[#20093e] border border-[#7e22ce]/40 text-xs font-semibold text-purple-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      id="btn-sidebar-sign-up"
                      onClick={onOpenSignUp}
                      className="w-full flex items-center justify-center py-2 rounded-xl bg-[#7e22ce] hover:bg-[#6b21a8] text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
                    >
                      Sign Up
                    </button>
                  </div>
                  <button
                    id="btn-sidebar-one-click-demo"
                    onClick={onOneClickDemo}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#140529] hover:bg-[#7e22ce] hover:text-white border border-[#7e22ce]/40 py-1.5 text-xs font-semibold text-[#d8b4fe] transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#e879f9]" />
                    <span>Demo Login</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-sidebar-collapsed-login"
                  onClick={onOpenSignIn}
                  title="Sign In"
                  className="w-full flex items-center justify-center p-2.5 rounded-xl bg-[#7e22ce] text-white cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Theme Indicator Pill matching Screenshot */}
          {(!isCollapsed || isOpen) && (
            <div className="rounded-xl bg-[#140529] border border-[#3b1366] px-3 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#e9d5ff]">
              <Palette className="h-3.5 w-3.5 text-[#e879f9]" />
              <span>Theme: Purple UI (Active)</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

