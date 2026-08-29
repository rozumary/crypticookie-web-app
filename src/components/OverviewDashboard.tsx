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
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>System Overview</span>
              <span className="h-2 w-2 rounded-full bg-pink-500" />
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono border border-pink-500/30 font-semibold">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-purple-300/70 mt-1">
            Live monitoring and protection for website cookies, privacy choices, and consent banners.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-purple-200 border border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-pink-400" />
            <span>View Blockchain</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Metrics Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-pink-400" />
            <span>System Telemetry & Metrics</span>
          </h2>
          <span className="text-xs font-mono text-pink-300 bg-[#1A0935] px-2.5 py-1 rounded-full border border-pink-500/30 font-semibold">
            Live Stats
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Protected Domains</span>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {metrics.protectedPlatformsCount}
            </div>
            <span className="text-[11px] text-pink-400 mt-1 block font-mono font-medium">Monitored Websites</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Blockchain Blocks</span>
            <div className="text-2xl sm:text-3xl font-bold text-purple-200 mt-1">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-purple-300 mt-1 block font-mono font-medium">Tamper-Proof Logs</span>
          </div>

          <div className="bg-[#1B0A38] border border-[#3A186B] p-5 rounded-2xl hover:border-purple-400/50 hover:bg-[#230D48] transition-all shadow-sm shadow-purple-950/20">
            <span className="text-xs font-semibold text-purple-200/80">Threats Blocked</span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
              {metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-400 mt-1 block font-mono font-medium">Tricky Banners Blocked</span>
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

      {/* SECTION 3: Record Real Consent Event Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-pink-400" />
            <span>Record Real Consent Event</span>
          </h2>
          <p className="text-xs text-purple-300/70 mt-0.5">
            Log a website cookie choice to instantly verify its safety and save your privacy preference.
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
                placeholder="e.g. github.com"
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
                required
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

      {/* SECTION 4: Recent Real Events Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Database Consent Events</h2>
            <p className="text-xs text-purple-300/70 mt-0.5">
              Recent cookie permissions and security checks saved in your browser history.
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
                      No consent events logged yet. Submit a test event above.
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 8).map((ev) => (
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
