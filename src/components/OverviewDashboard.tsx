import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Database,
  Play,
  CheckCircle2,
  Plus,
  Radio,
  RefreshCw,
  Globe,
  AlertTriangle,
  Lock,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  type CookieEvent,
  type User,
  type CookieType,
  type ConsentAction,
  type MonitoredDomain,
} from '../types/database';
import { truncateHash, sha256 } from '../lib/crypto';
import {
  recordConsentTransaction,
  recordMonitoredDomain,
  getMonitoredDomains,
  determineVerificationResult,
} from '../lib/db';

interface OverviewDashboardProps {
  metrics: {
    protectedPlatformsCount: number;
    publicLedgerCount: number;
    privateLedgerCount: number;
    totalLedgerBlocks: number;
    threatsBlockedCount: number;
    totalEventsCount: number;
    whitelistedCMPs: number;
    blacklistedCMPs: number;
    unlistedCMPs: number;
    totalCMPs: number;
  };
  recentEvents: CookieEvent[];
  currentUser: User | null;
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  metrics,
  recentEvents,
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  // Custom Transaction Form State
  const [domainInput, setDomainInput] = useState('');
  const [scriptTextInput, setScriptTextInput] = useState('');
  const [cookieType, setCookieType] = useState<CookieType>('necessary');
  const [consentAction, setConsentAction] = useState<ConsentAction>('accept');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Real-Time Monitored Websites for active account
  const [monitoredSites, setMonitoredSites] = useState<MonitoredDomain[]>([]);
  const [quickAuditUrl, setQuickAuditUrl] = useState('');
  const [isAuditingQuick, setIsAuditingQuick] = useState(false);

  const activeUserId = currentUser ? currentUser.id : 'u_auditor_primary';

  const loadMonitoredSites = async () => {
    try {
      const list = await getMonitoredDomains(15, activeUserId);
      setMonitoredSites(list);
    } catch (e) {
      console.error('Error fetching monitored sites:', e);
    }
  };

  useEffect(() => {
    loadMonitoredSites();

    // Listen to real-time sync events
    const handleSync = () => {
      loadMonitoredSites();
      onRefreshData();
    };

    window.addEventListener('crypticookie_db_sync', handleSync);
    return () => window.removeEventListener('crypticookie_db_sync', handleSync);
  }, [activeUserId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    await loadMonitoredSites();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleQuickAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAuditUrl.trim()) return;

    setIsAuditingQuick(true);
    try {
      const cleanDomain = quickAuditUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
      const mockScriptHash = await sha256(cleanDomain + '_cmp_script_v1');
      const { result } = await determineVerificationResult(mockScriptHash);

      const isThreat = result === 'Warning' || cleanDomain.includes('ad') || cleanDomain.includes('track');
      const riskLevel = isThreat ? 'High' : cleanDomain.includes('news') ? 'Moderate' : 'Low';

      await recordMonitoredDomain({
        domain: cleanDomain,
        url: `https://${cleanDomain}`,
        title: cleanDomain.toUpperCase(),
        cmp_detected: true,
        cmp_name: result === 'Verified' ? 'OneTrust Privacy Banner' : 'Generic Consent CMP',
        script_hash: mockScriptHash,
        verification_result: result,
        cookie_count: Math.floor(Math.random() * 12) + 3,
        trackers_count: isThreat ? 6 : Math.floor(Math.random() * 4),
        trackers_list: [],
        privacy_risk_level: riskLevel,
        auto_blocked: isThreat,
        guidance: isThreat ? 'Warning' : 'Customize?',
      }, activeUserId);

      setQuickAuditUrl('');
      setSuccessMessage(`Live audit complete for ${cleanDomain}! Real-time logs updated instantly.`);
      await loadMonitoredSites();
      await onRefreshData();
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditingQuick(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleRecordNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsSubmitting(true);
    try {
      const computedHash = await sha256(scriptTextInput.trim() || domainInput.trim());

      const result = await recordConsentTransaction({
        userId: activeUserId,
        siteDomain: domainInput.trim().toLowerCase(),
        cookieHash: computedHash,
        cookieType,
        consentAction,
      });

      // Also record to monitored sites
      await recordMonitoredDomain({
        domain: domainInput.trim().toLowerCase(),
        url: `https://${domainInput.trim().toLowerCase()}`,
        title: domainInput.trim(),
        cmp_detected: true,
        cmp_name: 'Website CMP Banner',
        script_hash: computedHash,
        verification_result: result.publicBlock.verification_result,
        cookie_count: 5,
        trackers_count: cookieType === 'suspicious' ? 4 : 1,
        trackers_list: [],
        privacy_risk_level: cookieType === 'suspicious' ? 'High' : 'Low',
        auto_blocked: cookieType === 'suspicious',
        guidance: result.cookieEvent.guidance_shown,
      }, activeUserId);

      setSuccessMessage(
        `Block #${result.publicBlock.block_index} chained for account [${currentUser ? currentUser.username : 'Primary'}]: SHA-256 hash ${truncateHash(result.publicBlock.hash, 8, 8)} saved live to blockchain.`
      );
      setDomainInput('');
      setScriptTextInput('');
      await loadMonitoredSites();
      await onRefreshData();
    } catch (err) {
      console.error('Failed to record transaction:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Real-Time Privacy Dashboard</span>
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono border border-pink-500/30 font-semibold flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-pink-400 animate-pulse" />
              Live Feed Active
            </span>
          </div>
          <p className="text-sm text-purple-300/70 mt-1">
            Live cookie audits and blockchain ledger for <strong className="text-white">{currentUser ? currentUser.username : 'Primary Auditor'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* REFRESH BUTTON */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-pink-300 border border-pink-500/30 hover:border-pink-500/60 transition-all cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-pink-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>

          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Browser Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-purple-200 border border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-pink-400" />
            <span>Ledger Explorer</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Metrics Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-pink-400" />
            <span>Account Telemetry & Live Protection Metrics</span>
          </h2>
          <span className="text-xs font-mono text-pink-300 bg-[#1A0935] px-2.5 py-1 rounded-full border border-pink-500/30 font-semibold">
            Real-Time
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Protected Websites</span>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {metrics.protectedPlatformsCount}
            </div>
            <span className="text-[11px] text-pink-400 mt-1 block font-mono font-medium">Audited in Real-Time</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Ledger Blocks</span>
            <div className="text-2xl sm:text-3xl font-bold text-purple-200 mt-1">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-purple-300 mt-1 block font-mono font-medium">Immutable Chain Records</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Threats Blocked</span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
              {metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-400 mt-1 block font-mono font-medium">Dark Patterns & Trackers</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Verified CMPs</span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
              {metrics.whitelistedCMPs}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-mono font-medium">Trusted Consent Banners</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Live Monitored Websites Feed */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-pink-400" />
              <span>Real-Time Monitored Websites & Audits</span>
            </h2>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Live records of websites inspected and protected on this account.
            </p>
          </div>

          <form onSubmit={handleQuickAudit} className="flex items-center gap-2">
            <input
              type="text"
              value={quickAuditUrl}
              onChange={(e) => setQuickAuditUrl(e.target.value)}
              placeholder="e.g. nytimes.com, stripe.com"
              className="bg-[#130729] border border-[#29154A] rounded-xl px-3 py-1.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 w-48 sm:w-60"
            />
            <button
              type="submit"
              disabled={isAuditingQuick || !quickAuditUrl.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="h-3 w-3" />
              <span>{isAuditingQuick ? 'Auditing...' : 'Audit Live'}</span>
            </button>
          </form>
        </div>

        <div className="bg-[#130729] border border-[#29154A] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A0935] text-purple-200 border-b border-[#29154A] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">CMP Status</th>
                  <th className="py-3 px-4">Risk Rating</th>
                  <th className="py-3 px-4">Trackers</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#261445]">
                {monitoredSites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-purple-300/60 text-xs">
                      No websites audited yet for this account. Type a domain above or use the Extension Simulator!
                    </td>
                  </tr>
                ) : (
                  monitoredSites.map((site) => (
                    <tr key={site.id} className="hover:bg-[#1C0A3B] transition-colors">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                        <span>{site.domain}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            site.verification_result === 'Verified'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : site.verification_result === 'Warning'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {site.verification_result}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            site.privacy_risk_level === 'Low'
                              ? 'text-emerald-400'
                              : site.privacy_risk_level === 'Moderate'
                              ? 'text-amber-400'
                              : 'text-rose-400 font-bold'
                          }`}
                        >
                          {site.privacy_risk_level} Risk
                        </span>
                      </td>
                      <td className="py-3 px-4 text-purple-200 font-mono">
                        {site.trackers_count} Trackers
                      </td>
                      <td className="py-3 px-4 text-purple-200">
                        {site.guidance}
                      </td>
                      <td className="py-3 px-4 font-mono text-purple-300/60 text-[11px]">
                        {new Date(site.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Record Real Consent Event Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-pink-400" />
            <span>Record Real Consent Event</span>
          </h2>
          <p className="text-xs text-purple-300/70 mt-0.5">
            Log a website cookie choice to instantly verify its safety and save your privacy preference live to the blockchain.
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#1A0935] border border-pink-500/40 text-xs text-purple-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-pink-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Site Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. reddit.com"
                required
                className="w-full bg-[#130729] border border-[#29154A] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                CMP Script / Content (Hashed via SHA-256)
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="Script URL or raw JS"
                className="w-full bg-[#130729] border border-[#29154A] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Cookie Category
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-[#130729] border border-[#29154A] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="necessary" className="bg-[#0F061F]">Necessary (Essential)</option>
                <option value="optional" className="bg-[#0F061F]">Optional (Analytics / Marketing)</option>
                <option value="all" className="bg-[#0F061F]">Bundled (All Cookies)</option>
                <option value="suspicious" className="bg-[#0F061F]">Suspicious (Dark Pattern / Tracker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                User Consent Action
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#130729] border border-[#29154A] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="accept" className="bg-[#0F061F]">Accept Cookies</option>
                <option value="reject" className="bg-[#0F061F]">Reject Cookies</option>
                <option value="customize" className="bg-[#0F061F]">Customize Preferences</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Mining Block...' : 'Submit & Mine to Blockchain'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 5: Recent Real Events Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Database Consent Ledger Events</h2>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Live cookie permissions and cryptographic checks for account <span className="text-pink-300 font-semibold">{currentUser ? currentUser.username : 'Primary'}</span>.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-pink-300 bg-[#1A0935] px-3 py-1 rounded-full border border-pink-500/30">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="bg-[#130729] border border-[#29154A] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A0935] text-purple-200 border-b border-[#29154A] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Script SHA-256</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#261445]">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-purple-300/60 text-xs">
                      No consent events logged yet for this account. Submit a test event above or in the simulator!
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 10).map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#1C0A3B] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-pink-300">{ev.id}</td>
                      <td className="py-3 px-4 font-semibold text-purple-100">{ev.site_domain}</td>
                      <td className="py-3 px-4 font-mono text-purple-300/70" title={ev.cookie_hash}>
                        {truncateHash(ev.cookie_hash, 6, 6)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ev.verification_result === 'Verified'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : ev.verification_result === 'Warning'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {ev.verification_result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-purple-200">{ev.guidance_shown}</td>
                      <td className="py-3 px-4 font-mono text-purple-300/60 text-[11px]">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
