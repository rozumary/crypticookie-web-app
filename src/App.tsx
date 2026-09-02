import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ExtensionSimulator } from './components/ExtensionSimulator';
import { BlockchainExplorer } from './components/BlockchainExplorer';
import { CMPRegistryManager } from './components/CMPRegistryManager';
import { TutorialGuide } from './components/TutorialGuide';
import { SettingsView } from './components/SettingsView';
import { DatabaseConsole } from './components/DatabaseConsole';
import { AuthModal } from './components/AuthModal';
import { initializeDatabase, getDatabaseMetrics, db, setupFirestoreRealtimeListeners, INITIAL_DEMO_USERS, broadcastDbUpdate, syncAllFromCentralServer, isUserMatch } from './lib/db';
import { type User, type CookieEvent } from './types/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDbReady, setIsDbReady] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
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
      const userEvents = allEvents.filter((e) => isUserMatch(e.user_id, activeUserId));
      setRecentEvents(userEvents);
    } catch (err) {
      console.error('Error refreshing DB metrics:', err);
    }
  }, [activeUserId]);

  // Synchronize active user with server so extension actions bind to Mary
  useEffect(() => {
    if (currentUser) {
      fetch('/api/session/active-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser }),
      }).catch(err => console.warn('Session sync note:', err));
    }
  }, [currentUser]);

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
    const boot = async () => {
      try {
        await initializeDatabase();
        await syncAllFromCentralServer();

        const storedUserId = localStorage.getItem('crypticookie_active_user_id');
        const storedUsername = localStorage.getItem('crypticookie_active_username') || 'User';

        if (storedUserId) {
          let user = await db.users.get(storedUserId);
          if (!user) {
            user = {
              id: storedUserId,
              username: storedUsername,
              email: `${storedUsername.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
              password_hash: 'stored_local',
              created_at: new Date().toISOString(),
            };
            await db.users.put(user);
          }
          setCurrentUser(user);
        } else {
          // If no stored user, check if any user exists in database
          const allUsers = await db.users.toArray();
          if (allUsers.length > 0) {
            const mary = allUsers.find(u => u.username?.toLowerCase() === 'mary' || u.username?.toLowerCase() === 'rozu') || allUsers[0];
            setCurrentUser(mary);
            localStorage.setItem('crypticookie_active_user_id', mary.id);
            localStorage.setItem('crypticookie_active_username', mary.username || mary.id);
          } else {
            setCurrentUser(null);
            setIsAuthModalOpen(true);
          }
        }
      } catch (err) {
        console.error('Boot initialization error:', err);
      } finally {
        setIsDbReady(true);
        setIsInitialSyncDone(true);
      }
    };
    boot();
  }, []);

  // Real-time Firestore subscriptions per logged-in User Account
  useEffect(() => {
    if (!isDbReady) return;

    // Trigger full REST-based sync on active user change to bypass iframe WebSocket/long-poll restrictions
    syncAllFromCentralServer(activeUserId).then(() => {
      refreshDatabaseState();
      setIsInitialSyncDone(true);
    });

    let unsubListeners: (() => void) | null = null;
    try {
      unsubListeners = setupFirestoreRealtimeListeners(activeUserId, () => {
        refreshDatabaseState();
        broadcastDbUpdate();
      });
    } catch (err) {
      console.error('Error establishing Firestore subscriptions:', err);
    }

    return () => {
      if (unsubListeners) unsubListeners();
    };
  }, [activeUserId, isDbReady, refreshDatabaseState]);

  // Periodic REST polling fallback (every 2.5s) so browser extension data appears live
  useEffect(() => {
    if (!isDbReady) return;
    const pollInterval = setInterval(async () => {
      await syncAllFromCentralServer(activeUserId);
      refreshDatabaseState();
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [activeUserId, isDbReady, refreshDatabaseState]);

  // Synchronize active user ID to browser extension via window.postMessage
  useEffect(() => {
    window.postMessage({ type: 'CRYPTICOOKIE_USER_CHANGED', userId: activeUserId }, '*');
  }, [activeUserId]);

  const handleSelectUser = (user: User) => {
    localStorage.setItem('crypticookie_active_user_id', user.id);
    localStorage.setItem('crypticookie_active_username', user.username || user.id);
    setCurrentUser(user);
    window.dispatchEvent(new CustomEvent('crypticookie_user_changed', { detail: { userId: user.id, username: user.username } }));
    window.postMessage({ type: 'CRYPTICOOKIE_USER_CHANGED', userId: user.id, username: user.username }, '*');
  };

  const handleLogout = () => {
    localStorage.removeItem('crypticookie_active_user_id');
    localStorage.removeItem('crypticookie_active_username');
    setCurrentUser(null);
    setAuthMode('signin');
    setIsAuthModalOpen(true);
    window.dispatchEvent(new CustomEvent('crypticookie_user_changed', { detail: { userId: null } }));
    window.postMessage({ type: 'CRYPTICOOKIE_USER_CHANGED', userId: null }, '*');
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
    handleSelectUser(user);
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
          {!isInitialSyncDone ? (
            <div className="flex h-[80vh] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
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
                <BlockchainExplorer currentUser={currentUser} onRefreshData={refreshDatabaseState} />
              )}

              {activeTab === 'cmp_registry' && (
                <CMPRegistryManager onRefreshData={refreshDatabaseState} />
              )}

              {activeTab === 'tutorial' && (
                <TutorialGuide onNavigateTab={setActiveTab} />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  currentUser={currentUser}
                  onRefreshData={refreshDatabaseState}
                />
              )}

              {activeTab === 'database' && (
                <DatabaseConsole
                  currentUser={currentUser}
                  onRefreshData={refreshDatabaseState}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        canClose={currentUser !== null}
        onLoginSuccess={(user) => {
          handleSelectUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
