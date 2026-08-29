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

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Top Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Privacy & Consent Overview
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-pink-300 text-[11px] font-mono font-bold border border-purple-500/40">
              Active Protection
            </span>
          </div>
          <p className="text-sm text-purple-200/80 mt-1">
            Real-time privacy engine tracking verified cookie banners, detecting dark patterns, and recording tamper-proof decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-purple-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e0a38]/80 hover:bg-[#2e1054] text-xs font-bold text-pink-200 border border-purple-800/60 hover:border-pink-500/60 transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-purple-950/40"
          >
            <Layers className="h-3.5 w-3.5 text-pink-400" />
            <span>View Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-gradient-to-b from-[#190633] to-[#120326] border border-purple-800/50 p-5 rounded-2xl shadow-lg hover:border-pink-500/50 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200/80">Protected Domains</span>
            <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-white mt-2 tracking-tight group-hover:text-pink-200 transition-colors">
            {metrics.protectedPlatformsCount}
          </div>
          <span className="text-[11px] text-pink-400/90 mt-1.5 block font-medium">Monitored Websites</span>
        </div>

        <div className="bg-gradient-to-b from-[#190633] to-[#120326] border border-purple-800/50 p-5 rounded-2xl shadow-lg hover:border-purple-400/60 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-200/80">Audit Records</span>
            <span className="h-2 w-2 rounded-full bg-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-200 mt-2 tracking-tight">
            {metrics.publicLedgerCount}
          </div>
          <span className="text-[11px] text-purple-400 mt-1.5 block font-medium">Tamper-Proof Logs</span>
        </div>

        <div className="bg-gradient-to-b from-[#240624] to-[#160216] border border-pink-900/50 p-5 rounded-2xl shadow-lg hover:border-rose-500/50 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-200/80">Threats Blocked</span>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-400 mt-2 tracking-tight">
            {metrics.threatsBlockedCount}
          </div>
          <span className="text-[11px] text-rose-400/90 mt-1.5 block font-medium">Deceptive Trackers Stopped</span>
        </div>

        <div className="bg-gradient-to-b from-[#091a24] to-[#040f17] border border-emerald-900/50 p-5 rounded-2xl shadow-lg hover:border-emerald-500/50 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/80">Verified CMPs</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-2 tracking-tight">
            {metrics.whitelistedCMPs}
          </div>
          <span className="text-[11px] text-emerald-300/90 mt-1.5 block font-medium">Trusted Providers</span>
        </div>
      </div>

      {/* Interactive Form: Real Database & Blockchain Event Creator */}
      <div className="bg-gradient-to-r from-[#1b0636] via-[#240a47] to-[#16042b] border-2 border-purple-800/60 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-pink-400" />
            <span>Test a Cookie Consent Decision</span>
          </h2>
          <p className="text-xs text-purple-200/70 mt-0.5">
            Test how a website cookie choice is verified against dark patterns and saved into an immutable audit record.
          </p>
        </div>

        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-sm font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Website Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. nytimes.com"
                required
                className="w-full bg-[#0d021c] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-pink-400 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Cookie Banner Script Source or URL
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="e.g. otSDKStub.js or script URL"
                required
                className="w-full bg-[#0d021c] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-purple-400/40 focus:outline-none focus:border-pink-400 transition-colors font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Cookie Risk Category
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-[#0d021c] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-400 transition-colors"
              >
                <option value="necessary">Necessary (Essential for Site)</option>
                <option value="optional">Optional (Analytics / Marketing)</option>
                <option value="all">Bundled (All Cookies)</option>
                <option value="suspicious">Suspicious (Potential Dark Pattern)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Your Consent Choice
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#0d021c] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-400 transition-colors"
              >
                <option value="accept">Accept Cookies</option>
                <option value="reject">Reject Cookies</option>
                <option value="customize">Customize Preferences</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs font-bold text-white shadow-lg shadow-purple-950/60 transition-all cursor-pointer flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Recording Decision...' : 'Save & Record Privacy Choice'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Real Events Table */}
      <div className="bg-gradient-to-b from-[#14052b] to-[#0c021a] border border-purple-800/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-purple-800/50 flex items-center justify-between bg-[#190636]">
          <div>
            <h2 className="text-sm font-bold text-pink-200">Saved Privacy Decisions</h2>
            <p className="text-xs text-purple-200/70 mt-0.5">
              History of recorded website cookie choices and smart security guidance.
            </p>
          </div>
          <span className="text-xs font-mono text-purple-200 bg-[#0b0217] px-2.5 py-1 rounded-lg border border-purple-800/60">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e021e] text-purple-300 border-b border-purple-800/40 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Website Domain</th>
                <th className="py-3 px-4">Security Fingerprint</th>
                <th className="py-3 px-4">Security Status</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 px-4">Time Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/40">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-purple-300/60 text-xs">
                    No privacy decisions recorded yet. Test an event above or use the simulator.
                  </td>
                </tr>
              ) : (
                recentEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-purple-900/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-pink-400 font-medium">{ev.id}</td>
                    <td className="py-3 px-4 font-medium text-white">{ev.site_domain}</td>
                    <td className="py-3 px-4 font-mono text-purple-300/90 text-[11px]" title={ev.cookie_hash}>
                      {truncateHash(ev.cookie_hash, 6, 6)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium font-mono ${
                          ev.verification_result === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : ev.verification_result === 'Warning'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {ev.verification_result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-purple-100 max-w-[220px] truncate" title={ev.guidance_shown}>{ev.guidance_shown}</td>
                    <td className="py-3 px-4 font-mono text-purple-300/80 text-[11px]">
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
