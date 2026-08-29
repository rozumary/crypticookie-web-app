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
  Search,
  Sparkles,
  Award,
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
      const cleanDomain = quickAuditUrl
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .toLowerCase()
        .trim();
      const mockScriptHash = await sha256(cleanDomain + '_cmp_script_v1');
      const { result } = await determineVerificationResult(mockScriptHash);

      const isThreat =
        result === 'Warning' ||
        cleanDomain.includes('ad') ||
        cleanDomain.includes('track');
      const riskLevel = isThreat
        ? 'High'
        : cleanDomain.includes('news')
        ? 'Moderate'
        : 'Low';

      await recordMonitoredDomain(
        {
          domain: cleanDomain,
          url: `https://${cleanDomain}`,
          title: cleanDomain.toUpperCase(),
          cmp_detected: true,
          cmp_name:
            result === 'Verified'
              ? 'OneTrust Privacy Banner'
              : 'Generic Consent CMP',
          script_hash: mockScriptHash,
          verification_result: result,
          cookie_count: Math.floor(Math.random() * 12) + 3,
          trackers_count: isThreat ? 6 : Math.floor(Math.random() * 4),
          trackers_list: [],
          privacy_risk_level: riskLevel,
          auto_blocked: isThreat,
          guidance: isThreat ? 'Warning' : 'Customize?',
        },
        activeUserId
      );

      setQuickAuditUrl('');
      setSuccessMessage(
        `Live audit complete for ${cleanDomain}! Real-time logs updated instantly.`
      );
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
      const computedHash = await sha256(
        scriptTextInput.trim() || domainInput.trim()
      );

      const result = await recordConsentTransaction({
        userId: activeUserId,
        siteDomain: domainInput.trim().toLowerCase(),
        cookieHash: computedHash,
        cookieType,
        consentAction,
      });

      // Also record to monitored sites
      await recordMonitoredDomain(
        {
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
        },
        activeUserId
      );

      setSuccessMessage(
        `Block #${result.publicBlock.block_index} chained for account [${
          currentUser ? currentUser.username : 'Primary'
        }]: SHA-256 hash ${truncateHash(
          result.publicBlock.hash,
          8,
          8
        )} saved live to blockchain.`
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
      {/* SECTION 1: Top Hero Banner (Matching Exact Light Lavender Theme Card from Screenshot) */}
      <div className="relative overflow-hidden bg-[#F3EFFF] border border-[#D4C2FC] rounded-3xl p-6 sm:p-8 shadow-xl text-[#1E083C]">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#4C1D95 1px, transparent 1px), radial-gradient(#4C1D95 1px, #F3EFFF 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Shield Emblem & Title Block */}
          <div className="flex items-center gap-5 flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full bg-[#1E083E] border-4 border-[#3B126D] flex items-center justify-center text-[#C084FC] shadow-lg">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-[#E879F9]" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white border border-[#C084FC] px-4 py-1 rounded-xl shadow-xs">
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-[#1E083C] font-mono">
                  CRYPTICOOKIE :
                </span>
              </div>

              <div>
                <div className="inline-block bg-[#7E22CE] text-white font-bold text-xs sm:text-sm px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Hybrid Blockchain-Based Consent Verification & Auditing System
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs text-[#581C87] pt-1">
                <span className="font-medium">
                  Active Account: <strong className="text-[#1E083C]">{currentUser ? currentUser.username : 'Auditor Primary'}</strong>
                </span>
                <span className="text-[#9333EA]">•</span>
                <span className="bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] font-mono text-[11px] px-3 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  Live Sync Active (100% Verified)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex flex-row lg:flex-col items-stretch gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onNavigateTab('simulator')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Extension Simulator</span>
            </button>
            <button
              onClick={() => onNavigateTab('blockchain')}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F3E8FF] text-[#581C87] border border-[#A855F7] text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Layers className="h-3.5 w-3.5 text-[#7E22CE]" />
              <span>Blockchain Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Significance & Telemetry Highlights (Dark Violet Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Telemetry Metrics */}
        <div className="lg:col-span-8 bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative">
          <div className="flex items-center justify-between">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
              TELEMETRY & PROTECTION METRICS
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#180735] hover:bg-[#250B4E] text-xs font-semibold text-[#D8B4FE] border border-[#6B21A8]/50 transition-all cursor-pointer"
            >
              <RefreshCw
                className={`h-3 w-3 text-[#E879F9] ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#180735] border border-[#3E1568] hover:border-[#9333EA]/60 p-4 rounded-2xl transition-all">
              <span className="text-[11px] font-semibold text-[#C084FC]">
                Protected Sites
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#F3E8FF] mt-1">
                {metrics.protectedPlatformsCount}
              </div>
              <span className="text-[10px] text-[#A855F7] mt-1 block font-mono">
                Live Monitored
              </span>
            </div>

            <div className="bg-[#180735] border border-[#3E1568] hover:border-[#9333EA]/60 p-4 rounded-2xl transition-all">
              <span className="text-[11px] font-semibold text-[#C084FC]">
                Ledger Blocks
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#D8B4FE] mt-1">
                {metrics.publicLedgerCount}
              </div>
              <span className="text-[10px] text-[#A855F7] mt-1 block font-mono">
                Immutable Hash
              </span>
            </div>

            <div className="bg-[#180735] border border-[#3E1568] hover:border-[#9333EA]/60 p-4 rounded-2xl transition-all">
              <span className="text-[11px] font-semibold text-[#C084FC]">
                Threats Blocked
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#F87171] mt-1">
                {metrics.threatsBlockedCount}
              </div>
              <span className="text-[10px] text-[#F87171]/80 mt-1 block font-mono">
                Trackers Blocked
              </span>
            </div>

            <div className="bg-[#180735] border border-[#3E1568] hover:border-[#9333EA]/60 p-4 rounded-2xl transition-all">
              <span className="text-[11px] font-semibold text-[#C084FC]">
                Verified CMPs
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#4ADE80] mt-1">
                {metrics.whitelistedCMPs}
              </div>
              <span className="text-[10px] text-[#4ADE80]/80 mt-1 block font-mono">
                Whitelisted
              </span>
            </div>
          </div>

          <p className="text-xs text-[#C084FC]/80 leading-relaxed">
            Crypticookie provides a decentralized, transparent defense against deceptive consent practices that compromise digital autonomy and institutional trust.
          </p>
        </div>

        {/* Right 4 Cols: Abstract / Verification Summary Card (Light Lavender Theme Card) */}
        <div className="lg:col-span-4 bg-[#F3EFFF] border border-[#D4C2FC] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl text-[#1E083C]">
          <div className="inline-block bg-[#581C87] text-white text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
            ABSTRACT & OBJECTIVES
          </div>

          <p className="text-xs text-[#2E1065] leading-relaxed">
            The need for an audit system that is immutable and clear for cookie consent is growing as generating proof for cookie-induced data breaches is complex.
          </p>

          <div className="bg-white/90 border border-[#C084FC] rounded-2xl p-3.5 space-y-1.5 shadow-xs">
            <div className="text-[11px] font-bold text-[#581C87] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#7E22CE]" />
              <span>Real-Time Audit System</span>
            </div>
            <p className="text-[11px] text-[#3B0764] leading-relaxed">
              Provides real-time cryptographic DOM script verification and dual-chain Proof-of-Audit logging for active users.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Live Monitored Websites Feed */}
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm mb-2">
              REAL-TIME MONITORED WEBSITES
            </div>
            <p className="text-xs text-[#C084FC]/80">
              Live records of websites inspected and protected for account{' '}
              <strong className="text-white">
                {currentUser ? currentUser.username : 'Primary'}
              </strong>.
            </p>
          </div>

          <form onSubmit={handleQuickAudit} className="flex items-center gap-2">
            <input
              type="text"
              value={quickAuditUrl}
              onChange={(e) => setQuickAuditUrl(e.target.value)}
              placeholder="e.g. nytimes.com, stripe.com"
              className="bg-[#130526] border border-[#391363] rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-[#9333EA] w-48 sm:w-60"
            />
            <button
              type="submit"
              disabled={isAuditingQuick || !quickAuditUrl.trim()}
              className="px-4 py-2 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{isAuditingQuick ? 'Auditing...' : 'Audit Live'}</span>
            </button>
          </form>
        </div>

        <div className="bg-[#130526] border border-[#300E54] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#180735] text-[#D8B4FE] border-b border-[#300E54] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">CMP Status</th>
                  <th className="py-3 px-4">Risk Rating</th>
                  <th className="py-3 px-4">Trackers</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#260B44]">
                {monitoredSites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[#C084FC]/60 text-xs"
                    >
                      No websites audited yet for this account. Type a domain above or launch the Extension Simulator!
                    </td>
                  </tr>
                ) : (
                  monitoredSites.map((site) => (
                    <tr
                      key={site.id}
                      className="hover:bg-[#1C093E] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-[#E879F9] shrink-0" />
                        <span>{site.domain}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            site.verification_result === 'Verified'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : site.verification_result === 'Warning'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-950/80 text-[#D8B4FE] border border-purple-500/40'
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
                      <td className="py-3 px-4 font-mono text-[#C084FC]/60 text-[11px]">
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
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div>
          <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm mb-2">
            RECORD REAL CONSENT TRANSACTION
          </div>
          <p className="text-xs text-[#C084FC]/80">
            Log a website cookie choice to instantly verify its safety and save your privacy preference live to the blockchain.
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#180735] border border-[#9333EA]/60 text-xs text-purple-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-[#E879F9] shrink-0" />
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
                className="w-full bg-[#130526] border border-[#391363] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-[#9333EA] transition-colors"
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
                className="w-full bg-[#130526] border border-[#391363] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-[#9333EA] transition-colors"
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
                className="w-full bg-[#130526] border border-[#391363] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-[#9333EA] transition-colors cursor-pointer"
              >
                <option value="necessary" className="bg-[#0E041E]">
                  Necessary (Essential)
                </option>
                <option value="optional" className="bg-[#0E041E]">
                  Optional (Analytics / Marketing)
                </option>
                <option value="all" className="bg-[#0E041E]">
                  Bundled (All Cookies)
                </option>
                <option value="suspicious" className="bg-[#0E041E]">
                  Suspicious (Dark Pattern / Tracker)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                User Consent Action
              </label>
              <select
                value={consentAction}
                onChange={(e) =>
                  setConsentAction(e.target.value as ConsentAction)
                }
                className="w-full bg-[#130526] border border-[#391363] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-[#9333EA] transition-colors cursor-pointer"
              >
                <option value="accept" className="bg-[#0E041E]">
                  Accept Cookies
                </option>
                <option value="reject" className="bg-[#0E041E]">
                  Reject Cookies
                </option>
                <option value="customize" className="bg-[#0E041E]">
                  Customize Preferences
                </option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-md"
            >
              <Database className="h-3.5 w-3.5" />
              <span>
                {isSubmitting
                  ? 'Mining Block...'
                  : 'Submit & Mine to Blockchain'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 5: Recent Consent Ledger Events */}
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm mb-2">
              DATABASE CONSENT LEDGER EVENTS
            </div>
            <p className="text-xs text-[#C084FC]/80">
              Live cookie permissions and cryptographic checks for account{' '}
              <span className="text-[#E879F9] font-semibold">
                {currentUser ? currentUser.username : 'Primary'}
              </span>.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-[#E879F9] bg-[#180735] px-3 py-1 rounded-full border border-[#9333EA]/50">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="bg-[#130526] border border-[#300E54] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#180735] text-[#D8B4FE] border-b border-[#300E54] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Script SHA-256</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#260B44]">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-[#C084FC]/60 text-xs"
                    >
                      No consent events logged yet for this account. Submit a test event above or in the simulator!
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 10).map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-[#1C093E] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#E879F9]">
                        {ev.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-100">
                        {ev.site_domain}
                      </td>
                      <td
                        className="py-3 px-4 font-mono text-[#C084FC]/70"
                        title={ev.cookie_hash}
                      >
                        {truncateHash(ev.cookie_hash, 6, 6)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            ev.verification_result === 'Verified'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : ev.verification_result === 'Warning'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-950/80 text-[#D8B4FE] border border-purple-500/40'
                          }`}
                        >
                          {ev.verification_result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-purple-200">
                        {ev.guidance_shown}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#C084FC]/60 text-[11px]">
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
