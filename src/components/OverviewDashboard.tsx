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
      <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-purple-950/20">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Privacy & Security Dashboard</span>
              <span className="h-2 w-2 rounded-full bg-pink-500" />
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono border border-pink-500/30 font-semibold">
              Live Monitor
            </span>
          </div>
          <p className="text-sm text-purple-300/80 mt-1">
            Easily manage your cookie choices, view verified receipts, and check website safety.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-pink-900/20"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Test Browser Guard</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-purple-200 border border-pink-500/30 hover:border-pink-500/60 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-pink-400" />
            <span>View Receipt Log</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Metrics Outer Container */}
      <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-pink-400" />
            <span>Your Safety Stats</span>
          </h2>
          <span className="text-xs font-mono text-pink-300 bg-[#1A0935] px-2.5 py-1 rounded-full border border-pink-500/30 font-semibold">
            Live Protection Active
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1B0D38] border border-[#33185E] p-5 rounded-2xl hover:border-pink-500/50 transition-all">
            <span className="text-xs font-semibold text-purple-300/80">Protected Websites</span>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {metrics.protectedPlatformsCount}
            </div>
            <span className="text-[11px] text-pink-400 mt-1 block font-mono font-medium">Websites You Guard</span>
          </div>

          <div className="bg-[#1B0D38] border border-[#33185E] p-5 rounded-2xl hover:border-pink-500/50 transition-all">
            <span className="text-xs font-semibold text-purple-300/80">Security Receipts</span>
            <div className="text-2xl sm:text-3xl font-bold text-purple-300 mt-1">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-purple-400 mt-1 block font-mono font-medium">Saved Proof of Choices</span>
          </div>

          <div className="bg-[#1B0D38] border border-[#33185E] p-5 rounded-2xl hover:border-pink-500/50 transition-all">
            <span className="text-xs font-semibold text-purple-300/80">Tricky Popups Blocked</span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 mt-1">
              {metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-400 mt-1 block font-mono font-medium">Manipulative Popups Stopped</span>
          </div>

          <div className="bg-[#1B0D38] border border-[#33185E] p-5 rounded-2xl hover:border-pink-500/50 transition-all">
            <span className="text-xs font-semibold text-purple-300/80">Approved Popups</span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-1">
              {metrics.whitelistedCMPs}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-mono font-medium">Verified Safe Banners</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Record Real Consent Event Outer Container */}
      <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg shadow-purple-950/20">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-pink-400" />
            <span>Record Your Cookie Preference</span>
          </h2>
          <p className="text-xs text-purple-300/80 mt-0.5">
            Save your cookie choice for any website (like Accept or Reject) and keep a safe digital receipt in your history.
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
                Website Name / Domain
              </label>
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. github.com, google.com"
                required
                className="w-full bg-[#170A30] border border-[#301659] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Cookie Banner Code / Script
              </label>
              <input
                type="text"
                value={scriptTextInput}
                onChange={(e) => setScriptTextInput(e.target.value)}
                placeholder="Paste script URL or snippet (we generate a digital security fingerprint)"
                required
                className="w-full bg-[#170A30] border border-[#301659] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Type of Cookies
              </label>
              <select
                value={cookieType}
                onChange={(e) => setCookieType(e.target.value as CookieType)}
                className="w-full bg-[#170A30] border border-[#301659] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="necessary" className="bg-[#170A30]">Necessary (Essential for website function)</option>
                <option value="optional" className="bg-[#170A30]">Optional (Analytics & Advertising)</option>
                <option value="all" className="bg-[#170A30]">Bundled (All Cookies)</option>
                <option value="suspicious" className="bg-[#170A30]">Suspicious (Sneaky Popup / Tracker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Your Cookie Choice
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#170A30] border border-[#301659] rounded-xl px-3.5 py-2.5 text-xs text-purple-100 focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="accept" className="bg-[#170A30]">Accept Cookies</option>
                <option value="reject" className="bg-[#170A30]">Reject Cookies</option>
                <option value="customize" className="bg-[#170A30]">Customize Preferences</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-semibold text-white transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-pink-900/30"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving Choice...' : 'Save Cookie Choice & Generate Receipt'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: Recent Real Events Outer Container */}
      <div className="bg-gradient-to-br from-[#231247] via-[#170B33] to-[#2A0E48] border border-[#3D1E6D] rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg shadow-purple-950/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Cookie Decisions Log</h2>
            <p className="text-xs text-purple-300/80 mt-0.5">
              Live records of your saved website cookie choices and safety checks.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-pink-300 bg-[#1A0935] px-3 py-1 rounded-full border border-pink-500/30">
            {recentEvents.length} Saved Records
          </span>
        </div>

        <div className="bg-[#1B0D38] border border-[#33185E] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1D093A] text-purple-200 border-b border-[#33185E] font-mono text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Receipt ID</th>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Digital Fingerprint</th>
                  <th className="py-3 px-4">Safety Status</th>
                  <th className="py-3 px-4">Protection Advice</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E1652]">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-purple-300/60 text-xs">
                      No cookie decisions logged yet. Save your first choice above!
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 8).map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#251048] transition-colors">
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
                          {ev.verification_result === 'Verified' ? 'Verified Safe' : ev.verification_result === 'Warning' ? 'Warning / Caution' : ev.verification_result}
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
