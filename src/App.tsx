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
import { initializeDatabase, getDatabaseMetrics, db, setupFirestoreRealtimeListeners } from './lib/db';
import { type User, type CookieEvent } from './types/database';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDbReady, setIsDbReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Chrome Profile Isolation State
  const [activeProfileId, setActiveProfileId] = useState<string>(
    () => localStorage.getItem('crypticookie_active_profile_id') || 'profile_a'
  );

  const handleSelectProfile = (newProfileId: string) => {
    localStorage.setItem('crypticookie_active_profile_id', newProfileId);
    setActiveProfileId(newProfileId);
  };

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

  // Refresh all state from database for current isolated Chrome Profile
  const refreshDatabaseState = async (profId: string = activeProfileId) => {
    try {
      const stats = await getDatabaseMetrics(profId);
      setMetrics(stats);

      const allEvents = await db.cookie_events.orderBy('created_at').reverse().toArray();
      const profileEvents = allEvents.filter((e) => (e.profile_id || 'profile_a') === profId);
      setRecentEvents(profileEvents);
    } catch (err) {
      console.error('Error refreshing DB metrics:', err);
    }
  };

  // Trigger state refresh on profile change
  useEffect(() => {
    if (isDbReady) {
      refreshDatabaseState(activeProfileId);
    }
  }, [activeProfileId, isDbReady]);

  // Initial Boot
  useEffect(() => {
    let unsubListeners: (() => void) | null = null;
    const boot = async () => {
      try {
        await initializeDatabase();
        setIsDbReady(true);
        await refreshDatabaseState(activeProfileId);

        // Start real-time Firestore listeners
        unsubListeners = setupFirestoreRealtimeListeners(() => {
          refreshDatabaseState(activeProfileId);
        });

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

    return () => {
      if (unsubListeners) unsubListeners();
    };
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
    <div className="min-h-screen flex bg-gradient-to-br from-[#3b1764] via-[#250e42] to-[#1c0836] bg-fixed text-purple-100 font-sans selection:bg-pink-600 selection:text-white relative">
      {/* Ambient background glow accents */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.18),rgba(236,72,153,0.08),rgba(255,255,255,0))]" />

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
          activeProfileId={activeProfileId}
          onSelectProfile={handleSelectProfile}
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
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onRefreshData={() => refreshDatabaseState(activeProfileId)}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'simulator' && (
            <ExtensionSimulator
              currentUser={currentUser}
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onRefreshData={() => refreshDatabaseState(activeProfileId)}
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
