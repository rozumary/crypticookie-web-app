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
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time consent auditing engine with hybrid blockchain ledgers and IndexedDB storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span>View Blockchain</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Protected Domains</span>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {metrics.protectedPlatformsCount}
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Active In Database</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Blockchain Blocks</span>
          <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {metrics.publicLedgerCount}
          </div>
          <span className="text-[11px] text-purple-400 mt-1 block">Chained P & PB Ledgers</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Threats Blocked</span>
          <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
            {metrics.threatsBlockedCount}
          </div>
          <span className="text-[11px] text-rose-300 mt-1 block">Dark Patterns Intercepted</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl">
          <span className="text-xs font-medium text-slate-400">Verified CMPs</span>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
            {metrics.whitelistedCMPs}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Whitelisted Hashes</span>
        </div>
      </div>

      {/* Interactive Form: Real Database & Blockchain Event Creator */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            <span>Record Real Consent Event</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Submit a live consent transaction. Computes SHA-256, determines guidance, and writes blocks to IndexedDB.
          </p>
        </div>

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Site Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. github.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                CMP Script / Content (Hashed via SHA-256)
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="Script URL or raw JS"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Cookie Category
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="necessary">Necessary (Essential)</option>
                <option value="optional">Optional (Analytics / Marketing)</option>
                <option value="all">Bundled (All Cookies)</option>
                <option value="suspicious">Suspicious (Dark Pattern / Tracker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                User Consent Action
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="accept">Accept Cookies</option>
                <option value="reject">Reject Cookies</option>
                <option value="customize">Customize Preferences</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Engine: WebCrypto SHA-256 &bull; Dexie IndexedDB
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Mining Block...' : 'Submit & Mine to Blockchain'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Real Events Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Database Consent Events</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live records queried directly from the <code className="text-slate-300">cookie_events</code> table.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800/80 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Script SHA-256</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Guidance</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                    No consent events logged yet. Submit a test event above.
                  </td>
                </tr>
              ) : (
                recentEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-300">{ev.id}</td>
                    <td className="py-3 px-4 font-medium text-white">{ev.site_domain}</td>
                    <td className="py-3 px-4 font-mono text-slate-400" title={ev.cookie_hash}>
                      {truncateHash(ev.cookie_hash, 6, 6)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium font-mono ${
                          ev.verification_result === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : ev.verification_result === 'Warning'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {ev.verification_result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{ev.guidance_shown}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
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
