import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { BlockchainExplorer } from './components/BlockchainExplorer';
import { CMPRegistryManager } from './components/CMPRegistryManager';
import { SettingsView } from './components/SettingsView';
import { AIPrivacyBot } from './components/AIPrivacyBot';
import { DatabaseConsole } from './components/DatabaseConsole';
import { AuthModal } from './components/AuthModal';
import { initializeDatabase, getDatabaseMetrics, db } from './lib/db';
import { type User, type CookieEvent } from './types/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDbReady, setIsDbReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Live Database Metrics
  const [metrics, setMetrics] = useState({
    protectedPlatformsCount: 0,
    publicLedgerCount: 0,
    privateLedgerCount: 0,
    totalLedgerBlocks: 0,
    threatsBlockedCount: 0,
    totalEventsCount: 0,
    whitelistedCMPs: 0,
    blacklistedCMPs: 0,
    unlistedCMPs: 0,
    totalCMPs: 0,
  });

  const [recentEvents, setRecentEvents] = useState<CookieEvent[]>([]);

  // Refresh all state from database
  const refreshDatabaseState = async () => {
    try {
      const stats = await getDatabaseMetrics();
      setMetrics(stats);

      const evs = await db.cookie_events.orderBy('created_at').reverse().toArray();
      setRecentEvents(evs);
    } catch (err) {
      console.error('Error refreshing DB metrics:', err);
    }
  };

  // Initial Boot
  useEffect(() => {
    const boot = async () => {
      try {
        await initializeDatabase();
        setIsDbReady(true);
        await refreshDatabaseState();

        const storedUserId = localStorage.getItem('crypticookie_active_user_id');
        if (storedUserId) {
          const user = await db.users.get(storedUserId);
          if (user) setCurrentUser(user);
        }
      } catch (err) {
        console.error('Boot initialization error:', err);
      }
    };
    boot();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('crypticookie_active_user_id');
    setCurrentUser(null);
  };

  const handleOpenSignIn = () => {
    setAuthMode('signin');
    setIsAuthModalOpen(true);
  };

  const handleOpenSignUp = () => {
    setAuthMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleOneClickDemo = async () => {
    let user = await db.users.toCollection().first();
    if (!user) {
      user = {
        id: 'u_evaluator_' + Math.random().toString(36).substring(2, 9),
        username: 'Guest Evaluator',
        email: 'guest@crypticookie.local',
        password_hash: 'guest123_hash',
        created_at: new Date().toISOString(),
      };
      await db.users.add(user);
    }
    localStorage.setItem('crypticookie_active_user_id', user.id);
    setCurrentUser(user);
  };

  return (
    <div className="min-h-screen flex bg-[#F7F3FF] text-[#3B235C] font-sans selection:bg-[#8B4ED8] selection:text-white">
      {/* Left Sidebar Panel */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentUser={currentUser}
        onOpenSignIn={handleOpenSignIn}
        onOpenSignUp={handleOpenSignUp}
        onLogout={handleLogout}
        onOneClickDemo={handleOneClickDemo}
        isDbReady={isDbReady}
        metrics={metrics}
      />

      {/* Main Content & Top Header Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        {/* Navigation Header */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onOpenSignIn={handleOpenSignIn}
          onOpenSignUp={handleOpenSignUp}
          onLogout={handleLogout}
          onOneClickDemo={handleOneClickDemo}
          isDbReady={isDbReady}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8">
          {activeTab === 'overview' && (
            <OverviewDashboard
              metrics={metrics}
              recentEvents={recentEvents}
              currentUser={currentUser}
              onRefreshData={refreshDatabaseState}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'simulator' && (
            <ExtensionSimulator
              currentUser={currentUser}
              onRefreshData={refreshDatabaseState}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'blockchain' && (
            <BlockchainExplorer onRefreshData={refreshDatabaseState} />
          )}

          {activeTab === 'cmp_registry' && (
            <CMPRegistryManager onRefreshData={refreshDatabaseState} />
          )}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'ai_bot' && <AIPrivacyBot />}

          {activeTab === 'database' && (
            <DatabaseConsole onRefreshData={refreshDatabaseState} />
          )}
        </main>
      </div>

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        onLoginSuccess={(user) => {
          localStorage.setItem('crypticookie_active_user_id', user.id);
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
