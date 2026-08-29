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
      {/* SECTION 1: Top Header Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#3B235C] tracking-tight">
              System Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EDE1FF] text-[#8B4ED8] text-[11px] font-mono border border-[#B78AE8] font-semibold">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-[#6B528E] mt-1">
            Real-time consent auditing engine with hybrid blockchain ledgers and IndexedDB storage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B4ED8] hover:bg-[#783ec0] text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EDE1FF] hover:bg-[#EDE1FF]/80 text-xs font-semibold text-[#3B235C] border border-[#B78AE8] transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-[#8B4ED8]" />
            <span>View Blockchain</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Metrics Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#3B235C] flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#8B4ED8]" />
            <span>System Telemetry & Metrics</span>
          </h2>
          <span className="text-xs font-mono text-[#8B4ED8] bg-[#EDE1FF] px-2.5 py-1 rounded-full border border-[#B78AE8] font-semibold">
            Live Stats
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FCFAFF] border border-[#CBA3F5] p-5 rounded-2xl shadow-sm hover:border-[#8B4ED8] transition-all">
            <span className="text-xs font-semibold text-[#6B528E]">Protected Domains</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#3B235C] mt-1">
              {metrics.protectedPlatformsCount}
            </div>
            <span className="text-[11px] text-[#8B4ED8] mt-1 block font-mono font-medium">Active In Database</span>
          </div>

          <div className="bg-[#FCFAFF] border border-[#CBA3F5] p-5 rounded-2xl shadow-sm hover:border-[#8B4ED8] transition-all">
            <span className="text-xs font-semibold text-[#6B528E]">Blockchain Blocks</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#8B4ED8] mt-1">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-[#8B4ED8] mt-1 block font-mono font-medium">Chained P & PB Ledgers</span>
          </div>

          <div className="bg-[#FCFAFF] border border-[#CBA3F5] p-5 rounded-2xl shadow-sm hover:border-[#8B4ED8] transition-all">
            <span className="text-xs font-semibold text-[#6B528E]">Threats Blocked</span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
              {metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-600 mt-1 block font-mono font-medium">Dark Patterns Intercepted</span>
          </div>

          <div className="bg-[#FCFAFF] border border-[#CBA3F5] p-5 rounded-2xl shadow-sm hover:border-[#8B4ED8] transition-all">
            <span className="text-xs font-semibold text-[#6B528E]">Verified CMPs</span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
              {metrics.whitelistedCMPs}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block font-mono font-medium">Whitelisted Hashes</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Record Real Consent Event Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#3B235C] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#8B4ED8]" />
            <span>Record Real Consent Event</span>
          </h2>
          <p className="text-xs text-[#6B528E] mt-0.5">
            Submit a live consent transaction. Computes SHA-256, determines guidance, and writes blocks to IndexedDB.
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#EDE1FF] border border-[#B78AE8] text-xs text-[#3B235C] flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-[#8B4ED8] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#3B235C] mb-1.5">
                Site Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. github.com"
                required
                className="w-full bg-[#FCFAFF] border border-[#CBA3F5] rounded-xl px-3.5 py-2.5 text-xs text-[#3B235C] placeholder-[#6B528E]/40 focus:outline-none focus:border-[#8B4ED8] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B235C] mb-1.5">
                CMP Script / Content (Hashed via SHA-256)
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="Script URL or raw JS"
                required
                className="w-full bg-[#FCFAFF] border border-[#CBA3F5] rounded-xl px-3.5 py-2.5 text-xs text-[#3B235C] placeholder-[#6B528E]/40 focus:outline-none focus:border-[#8B4ED8] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#3B235C] mb-1.5">
                Cookie Category
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-[#FCFAFF] border border-[#CBA3F5] rounded-xl px-3.5 py-2.5 text-xs text-[#3B235C] focus:outline-none focus:border-[#8B4ED8] transition-colors cursor-pointer"
              >
                <option value="necessary">Necessary (Essential)</option>
                <option value="optional">Optional (Analytics / Marketing)</option>
                <option value="all">Bundled (All Cookies)</option>
                <option value="suspicious">Suspicious (Dark Pattern / Tracker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3B235C] mb-1.5">
                User Consent Action
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#FCFAFF] border border-[#CBA3F5] rounded-xl px-3.5 py-2.5 text-xs text-[#3B235C] focus:outline-none focus:border-[#8B4ED8] transition-colors cursor-pointer"
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
              className="px-5 py-2.5 rounded-xl bg-[#8B4ED8] hover:bg-[#783ec0] text-xs font-semibold text-white shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Mining Block...' : 'Submit & Mine to Blockchain'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: Recent Real Events Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#3B235C]">Database Consent Events</h2>
            <p className="text-xs text-[#6B528E] mt-0.5">
              Live records queried directly from the <code className="text-[#8B4ED8] font-mono">cookie_events</code> table.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#8B4ED8] bg-[#EDE1FF] px-3 py-1 rounded-full border border-[#B78AE8]">
            {recentEvents.length} Total Records
          </span>
        </div>

        <div className="bg-[#FCFAFF] border border-[#CBA3F5] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EDE1FF] text-[#3B235C] border-b border-[#CBA3F5] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Script SHA-256</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Guidance</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBA3F5]/40">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#6B528E] text-xs">
                      No consent events logged yet. Submit a test event above.
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 8).map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#F3ECFF] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#8B4ED8]">{ev.id}</td>
                      <td className="py-3 px-4 font-semibold text-[#3B235C]">{ev.site_domain}</td>
                      <td className="py-3 px-4 font-mono text-[#6B528E]" title={ev.cookie_hash}>
                        {truncateHash(ev.cookie_hash, 6, 6)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ev.verification_result === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : ev.verification_result === 'Warning'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-purple-100 text-purple-800 border border-purple-300'
                          }`}
                        >
                          {ev.verification_result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#3B235C]">{ev.guidance_shown}</td>
                      <td className="py-3 px-4 font-mono text-[#6B528E] text-[11px]">
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
