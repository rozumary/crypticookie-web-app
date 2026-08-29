import React, { useState, useEffect, useCallback } from 'react';
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
import { initializeDatabase, getDatabaseMetrics, db, setupFirestoreRealtimeListeners, INITIAL_DEMO_USERS } from './lib/db';
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

  const activeUserId = currentUser ? currentUser.id : 'u_auditor_primary';

  // Refresh all state from database for current isolated User Account
  const refreshDatabaseState = useCallback(async () => {
    try {
      const stats = await getDatabaseMetrics(activeUserId);
      setMetrics(stats);

      const allEvents = await db.cookie_events.orderBy('created_at').reverse().toArray();
      const userEvents = allEvents.filter((e) => !e.user_id || e.user_id === activeUserId);
      setRecentEvents(userEvents);
    } catch (err) {
      console.error('Error refreshing DB metrics:', err);
    }
  }, [activeUserId]);

  // Trigger state refresh on user account change or db ready
  useEffect(() => {
    if (isDbReady) {
      refreshDatabaseState();
    }
  }, [activeUserId, isDbReady, refreshDatabaseState]);

  // Real-time synchronization event listener
  useEffect(() => {
    const handleSync = () => {
      refreshDatabaseState();
    };
    window.addEventListener('crypticookie_db_sync', handleSync);
    return () => window.removeEventListener('crypticookie_db_sync', handleSync);
  }, [refreshDatabaseState]);

  // Initial Boot
  useEffect(() => {
    let unsubListeners: (() => void) | null = null;
    const boot = async () => {
      try {
        await initializeDatabase();
        setIsDbReady(true);

        const storedUserId = localStorage.getItem('crypticookie_active_user_id');
        if (storedUserId) {
          const user = await db.users.get(storedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }

        // Start real-time Firestore listeners
        unsubListeners = setupFirestoreRealtimeListeners(() => {
          refreshDatabaseState();
        });
      } catch (err) {
        console.error('Boot initialization error:', err);
      }
    };
    boot();

    return () => {
      if (unsubListeners) unsubListeners();
    };
  }, []);

  const handleSelectUser = (user: User) => {
    localStorage.setItem('crypticookie_active_user_id', user.id);
    setCurrentUser(user);
    window.dispatchEvent(new CustomEvent('crypticookie_user_changed', { detail: { userId: user.id } }));
  };

  const handleLogout = () => {
    localStorage.removeItem('crypticookie_active_user_id');
    setCurrentUser(null);
    window.dispatchEvent(new CustomEvent('crypticookie_user_changed', { detail: { userId: null } }));
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
    const user = INITIAL_DEMO_USERS[0];
    localStorage.setItem('crypticookie_active_user_id', user.id);
    setCurrentUser(user);
  };

  return (
    <div className="min-h-screen flex bg-[#0B0516] text-purple-100 font-sans selection:bg-pink-600 selection:text-white">
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
          onSelectUser={handleSelectUser}
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

          {activeTab === 'settings' && <SettingsView currentUser={currentUser} onRefreshData={refreshDatabaseState} />}

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
          handleSelectUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
