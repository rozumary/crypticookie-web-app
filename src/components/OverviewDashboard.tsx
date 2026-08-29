import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Database,
  Play,
  CheckCircle2,
  ArrowRight,
  Plus,
  Radio,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { type CookieEvent, type User, type CookieType, type ConsentAction } from '../types/database';
import { truncateHash, sha256 } from '../lib/crypto';
import { recordConsentTransaction } from '../lib/db';
import { PurplePosterOverview } from './PurplePosterOverview';

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
  isPurple?: boolean;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  metrics,
  recentEvents,
  currentUser,
  onRefreshData,
  onNavigateTab,
  isPurple = true,
}) => {

  // Custom Transaction Form State
  const [domainInput, setDomainInput] = useState('');
  const [scriptTextInput, setScriptTextInput] = useState('');
  const [cookieType, setCookieType] = useState<CookieType>('necessary');
  const [consentAction, setConsentAction] = useState<ConsentAction>('accept');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRecordNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setIsSubmitting(true);
    try {
      const computedHash = await sha256(scriptTextInput.trim());
      const userId = currentUser ? currentUser.id : 'u_researcher_default';

      const result = await recordConsentTransaction({
        userId,
        siteDomain: domainInput.trim().toLowerCase(),
        cookieHash: computedHash,
        cookieType,
        consentAction,
      });

      setSuccessMessage(
        `Block #${result.publicBlock.block_index} chained: SHA-256 hash ${truncateHash(result.publicBlock.hash, 8, 8)} saved to database.`
      );
      await onRefreshData();
    } catch (err) {
      console.error('Failed to record transaction:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 6000);
    }
  };

  if (isPurple) {
    return (
      <PurplePosterOverview
        metrics={metrics}
        recentEvents={recentEvents}
        currentUser={currentUser}
        onRefreshData={onRefreshData}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-blue-100 via-violet-100 to-white bg-clip-text text-transparent">
              System Overview
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 text-[11px] font-mono border border-violet-500/20">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-blue-200/70 mt-1">
            Real-time privacy monitor tracking verified cookie banners and tamper-proof user decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-violet-950/60 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 text-xs font-semibold text-blue-200 border border-blue-800/40 hover:border-violet-600 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-violet-400" />
            <span>View Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b1026]/90 border border-blue-900/30 p-5 rounded-2xl shadow-sm hover:border-violet-700/40 transition-all">
          <span className="text-xs font-medium text-blue-300/70">Protected Domains</span>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {metrics.protectedPlatformsCount}
          </div>
          <span className="text-[11px] text-blue-400 mt-1 block font-medium">Monitored Websites</span>
        </div>

        <div className="bg-[#0b1026]/90 border border-blue-900/30 p-5 rounded-2xl shadow-sm hover:border-violet-700/40 transition-all">
          <span className="text-xs font-medium text-blue-300/70">Audit Records</span>
          <div className="text-2xl sm:text-3xl font-bold text-violet-300 mt-1">
            {metrics.publicLedgerCount}
          </div>
          <span className="text-[11px] text-violet-400 mt-1 block font-medium">Tamper-Proof Logs</span>
        </div>

        <div className="bg-[#0b1026]/90 border border-blue-900/30 p-5 rounded-2xl shadow-sm hover:border-violet-700/40 transition-all">
          <span className="text-xs font-medium text-blue-300/70">Threats Blocked</span>
          <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
            {metrics.threatsBlockedCount}
          </div>
          <span className="text-[11px] text-rose-300 mt-1 block font-medium">Deceptive Trackers Stopped</span>
        </div>

        <div className="bg-[#0b1026]/90 border border-blue-900/30 p-5 rounded-2xl shadow-sm hover:border-violet-700/40 transition-all">
          <span className="text-xs font-medium text-blue-300/70">Verified CMPs</span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
            {metrics.whitelistedCMPs}
          </div>
          <span className="text-[11px] text-blue-300/70 mt-1 block font-medium">Trusted Providers</span>
        </div>
      </div>

      {/* Interactive Form: Real Database & Blockchain Event Creator */}
      <div className="bg-[#0b1026]/90 border border-violet-900/30 rounded-2xl p-6 shadow-md shadow-violet-950/30">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-violet-400" />
            <span>Test a Cookie Consent Decision</span>
          </h2>
          <p className="text-xs text-blue-200/70 mt-0.5">
            Test how a website cookie choice is verified against dark patterns and saved into an immutable audit record.
          </p>
        </div>

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-violet-950/50 border border-violet-500/30 text-xs text-violet-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1.5">
                Website Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. nytimes.com"
                required
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1.5">
                Cookie Banner Script Source or URL
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="e.g. otSDKStub.js or script URL"
                required
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-blue-300/40 focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1.5">
                Cookie Risk Category
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="necessary">Necessary (Essential for Site)</option>
                <option value="optional">Optional (Analytics / Marketing)</option>
                <option value="all">Bundled (All Cookies)</option>
                <option value="suspicious">Suspicious (Potential Dark Pattern)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1.5">
                Your Consent Choice
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#060a17] border border-blue-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="accept">Accept Cookies</option>
                <option value="reject">Reject Cookies</option>
                <option value="customize">Customize Preferences</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-violet-950/60 transition-all cursor-pointer flex items-center gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Recording Decision...' : 'Save & Record Privacy Choice'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Real Events Table */}
      <div className="bg-[#0b1026]/90 border border-blue-900/30 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-blue-900/30 flex items-center justify-between bg-[#080d20]">
          <div>
            <h2 className="text-sm font-semibold text-white">Saved Privacy Decisions</h2>
            <p className="text-xs text-blue-200/70 mt-0.5">
              History of recorded website cookie choices and smart security guidance.
            </p>
          </div>
          <span className="text-xs font-mono text-blue-300 bg-[#060a17] px-2.5 py-1 rounded-lg border border-blue-900/40">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a17] text-blue-300/80 border-b border-blue-900/30 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Website Domain</th>
                <th className="py-3 px-4">Security Fingerprint</th>
                <th className="py-3 px-4">Security Status</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 px-4">Time Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-950/60">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-blue-300/60 text-xs">
                    No privacy decisions recorded yet. Test an event above or use the simulator.
                  </td>
                </tr>
              ) : (
                recentEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-violet-950/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-violet-400">{ev.id}</td>
                    <td className="py-3 px-4 font-medium text-white">{ev.site_domain}</td>
                    <td className="py-3 px-4 font-mono text-blue-200/70" title={ev.cookie_hash}>
                      {truncateHash(ev.cookie_hash, 6, 6)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                          ev.verification_result === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : ev.verification_result === 'Warning'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                        }`}
                      >
                        {ev.verification_result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-blue-100">{ev.guidance_shown}</td>
                    <td className="py-3 px-4 font-mono text-blue-300/70 text-[11px]">
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
  );
};
