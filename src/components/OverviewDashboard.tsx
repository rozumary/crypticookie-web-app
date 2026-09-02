import React, { useState, useEffect } from 'react';
import {
  Shield,
  Layers,
  Database,
  Play,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Globe,
  AlertTriangle,
  Lock,
  Search,
  ExternalLink,
  Check,
  X,
  Filter,
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
  syncAllFromCentralServer,
} from '../lib/db';
import { CrypticookieLogo } from './CrypticookieLogo';

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
    acceptedCount?: number;
    rejectedCount?: number;
    customizedCount?: number;
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
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'accept' | 'reject' | 'audited'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const activeUserId = currentUser ? currentUser.id : 'u_auditor_primary';

  const loadMonitoredSites = async () => {
    try {
      const list = await getMonitoredDomains(50, activeUserId);
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

    // Continuous real-time polling so extension choices appear live within seconds
    const interval = setInterval(() => {
      loadMonitoredSites();
    }, 2500);

    return () => {
      window.removeEventListener('crypticookie_db_sync', handleSync);
      clearInterval(interval);
    };
  }, [activeUserId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncAllFromCentralServer(activeUserId);
      await onRefreshData();
      await loadMonitoredSites();
    } catch (e) {
      console.error('Live sync error:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleQuickDecision = async (domain: string, action: ConsentAction) => {
    try {
      const computedHash = await sha256(domain + '_cmp_script');
      await recordConsentTransaction({
        userId: activeUserId,
        siteDomain: domain.toLowerCase().trim(),
        cookieHash: computedHash,
        cookieType: action === 'reject' ? 'suspicious' : 'necessary',
        consentAction: action,
      });
      setSuccessMessage(`Choice '${action.toUpperCase()}' successfully recorded for ${domain}!`);
      await loadMonitoredSites();
      await onRefreshData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Quick decision error:', err);
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

  // Filtered Monitored Domains
  // First, deduplicate by domain+userId: prefer entries that have a consent_action
  const deduplicatedSites = (() => {
    const domainMap = new Map<string, MonitoredDomain>();
    for (const site of monitoredSites) {
      const key = `${site.domain}_${site.user_id}`;
      const existing = domainMap.get(key);
      if (!existing) {
        domainMap.set(key, site);
      } else {
        // Prefer the entry that has a consent_action
        if (site.consent_action && !existing.consent_action) {
          domainMap.set(key, site);
        } else if (site.consent_action && existing.consent_action) {
          // Both have consent_action, keep the most recent
          if (new Date(site.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            domainMap.set(key, site);
          }
        } else if (!site.consent_action && !existing.consent_action) {
          // Neither has consent_action, keep the most recent
          if (new Date(site.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
            domainMap.set(key, site);
          }
        }
        // else: existing has consent_action but new doesn't - keep existing (do nothing)
      }
    }
    return Array.from(domainMap.values()).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  })();

  const filteredSites = deduplicatedSites.filter((site) => {
    const matchesSearch = site.domain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      site.cmp_name.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchesSearch) return false;

    if (decisionFilter === 'all') return true;
    if (decisionFilter === 'accept') return site.consent_action === 'accept';
    if (decisionFilter === 'reject') return site.consent_action === 'reject';
    if (decisionFilter === 'audited') return !site.consent_action;
    return true;
  });

  const totalAccepted = deduplicatedSites.filter(s => s.consent_action === 'accept').length +
    recentEvents.filter(e => e.consent_action === 'accept' && !deduplicatedSites.some(s => s.domain === e.site_domain && s.consent_action === 'accept')).length;
  const totalRejected = deduplicatedSites.filter(s => s.consent_action === 'reject').length +
    recentEvents.filter(e => e.consent_action === 'reject' && !deduplicatedSites.some(s => s.domain === e.site_domain && s.consent_action === 'reject')).length;

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <span>Hi, {currentUser ? currentUser.username : 'User'}!</span>
                <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono border border-pink-500/30 font-semibold flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-pink-400 animate-pulse" />
                Live Feed Active
              </span>
            </div>
            <p className="text-xs text-purple-300/70 mt-1">
              Live cookie audits and blockchain ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* LIVE SYNC BUTTON (ICON ONLY) */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-pink-300 border border-pink-500/30 hover:border-pink-500/60 transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
            title="Live Sync - Fetch latest extension & server updates"
          >
            <RefreshCw className={`h-4 w-4 text-pink-400 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            <span className="text-[11px] text-pink-400 mt-1 block font-mono font-medium">Audited & Monitored</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Accepted Websites</span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
              {totalAccepted}
            </div>
            <span className="text-[11px] text-emerald-400/80 mt-1 block font-mono font-medium">Recorded Choices</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Rejected / Blocked</span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
              {totalRejected > 0 ? totalRejected : metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-400 mt-1 block font-mono font-medium">Trackers Deflected</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Ledger Blocks</span>
            <div className="text-2xl sm:text-3xl font-bold text-purple-200 mt-1">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-purple-300 mt-1 block font-mono font-medium">Immutable Chain Records</span>
          </div>
        </div>
      </div>

      {/* SECTION 4.5: Real-Time Monitored Websites & Extension Decisions */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#1A0935] border border-pink-500/40 text-xs text-purple-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-pink-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-pink-400" />
              <span>Live Monitored Websites & Extension Decisions</span>
            </h2>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Live websites audited and protected by your Crypticookie extension.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-pink-300 bg-[#1A0935] px-3 py-1 rounded-full border border-pink-500/30">
              {deduplicatedSites.length} Audited Sites
            </span>
          </div>
        </div>

        <div className="bg-[#130729] border border-[#29154A] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A0935] text-purple-200 border-b border-[#29154A] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Website Domain</th>
                  <th className="py-3 px-4">CMP Detected</th>
                  <th className="py-3 px-4">User Consent Choice</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Trackers / Cookies</th>
                  <th className="py-3 px-4">Privacy Risk</th>
                  <th className="py-3 px-4">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#261445]">
                {deduplicatedSites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-purple-300/60 text-xs">
                      No live websites logged yet for this account. Browse Facebook, Messenger, or Google with the extension installed, or click <strong>Live Sync (🔄)</strong> above!
                    </td>
                  </tr>
                ) : (
                  deduplicatedSites.map((site) => (
                    <tr key={site.id} className="hover:bg-[#1C0A3B] transition-colors">
                      <td className="py-3 px-4 font-semibold text-purple-100 font-mono">
                        {site.domain}
                      </td>
                      <td className="py-3 px-4 text-purple-200">
                        {site.cmp_name || 'Generic Cookie Banner'}
                      </td>
                      <td className="py-3 px-4">
                        {site.consent_action === 'accept' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                            <span>ACCEPTED</span>
                          </span>
                        ) : site.consent_action === 'reject' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-rose-950/90 text-rose-300 border border-rose-500/40">
                            <X className="h-2.5 w-2.5 text-rose-400" />
                            <span>REJECTED</span>
                          </span>
                        ) : site.consent_action === 'customize' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-purple-950/90 text-purple-300 border border-purple-500/40">
                            <SlidersHorizontal className="h-2.5 w-2.5 text-purple-400" />
                            <span>CUSTOMIZED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-purple-400/80 bg-purple-950/40 border border-purple-500/20">
                            AUDITED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            site.verification_result === 'Verified'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : site.verification_result === 'Warning'
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {site.verification_result || 'Unverified'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-purple-300/80">
                        {site.trackers_count || 0} trackers, {site.cookie_count || 2} cookies
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            site.privacy_risk_level === 'High' || site.privacy_risk_level === 'Critical'
                              ? 'text-rose-400 bg-rose-950/40 border border-rose-500/30'
                              : site.privacy_risk_level === 'Moderate'
                              ? 'text-amber-400 bg-amber-950/40 border border-amber-500/30'
                              : 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
                          }`}
                        >
                          {site.privacy_risk_level || 'Low'}
                        </span>
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

      {/* SECTION 5: Database Consent Ledger Events Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Database Consent Ledger Events</h2>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Live cookie permissions and cryptographic checks.
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
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Script SHA-256</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#261445]">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-purple-300/60 text-xs">
                      No consent events logged yet for this account. Submit a test event above or in the simulator!
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 15).map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#1C0A3B] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-pink-300">{ev.id}</td>
                      <td className="py-3 px-4 font-semibold text-purple-100">{ev.site_domain}</td>
                      <td className="py-3 px-4">
                        {ev.consent_action === 'accept' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                            <Check className="h-2.5 w-2.5" />
                            <span>ACCEPT</span>
                          </span>
                        ) : ev.consent_action === 'reject' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-500/30">
                            <X className="h-2.5 w-2.5" />
                            <span>REJECT</span>
                          </span>
                        ) : ev.consent_action === 'customize' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-500/30">
                            <SlidersHorizontal className="h-2.5 w-2.5" />
                            <span>CUSTOMIZE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-purple-400 bg-purple-950/50 border border-purple-500/20">
                            LOGGED
                          </span>
                        )}
                      </td>
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
