import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Database,
  Play,
  CheckCircle2,
  Plus,
  Globe,
  Lock,
  AlertTriangle,
  CheckCircle,
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
        `Block #${result.publicBlock.block_index} chained: SHA-256 hash ${truncateHash(result.publicBlock.hash, 8, 8)} saved.`
      );
      await onRefreshData();
    } catch (err) {
      console.error('Failed to record transaction:', err);
    } finally {      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 6000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Privacy & Consent Overview
            </h1>
            <span className="bg-[#8b31ff] text-white font-mono text-[11px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md shadow-purple-950/60">
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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b31ff] hover:bg-[#7c3aed] text-xs font-bold text-white shadow-lg shadow-purple-950/80 transition-all cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Open Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e0838] hover:bg-[#280c4a] text-xs font-bold text-purple-200 border border-[#8b31ff]/60 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 text-[#c084fc]" />
            <span>View Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Main Container Card 1: System Metrics */}
      <div className="bg-[#1a0933] border-2 border-[#8b31ff] rounded-[24px] p-6 shadow-2xl space-y-4 relative">
        <div className="inline-block bg-[#8b31ff] text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-2">
          SYSTEM METRICS
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#100422] border border-[#7b2cbf]/50 p-4 rounded-2xl hover:border-[#9d4edd] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-300/80">Protected Domains</span>
              <div className="w-8 h-8 rounded-xl bg-[#3c096c]/70 border border-[#7b2cbf]/60 flex items-center justify-center text-[#d8b4fe]">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {metrics.protectedPlatformsCount}
            </div>
            <span className="text-[11px] text-purple-300/70 mt-1 block font-mono">Monitored Websites</span>
          </div>

          <div className="bg-[#100422] border border-[#7b2cbf]/50 p-4 rounded-2xl hover:border-[#9d4edd] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-300/80">Audit Records</span>
              <div className="w-8 h-8 rounded-xl bg-[#3c096c]/70 border border-[#7b2cbf]/60 flex items-center justify-center text-[#d8b4fe]">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#d8b4fe]">
              {metrics.publicLedgerCount}
            </div>
            <span className="text-[11px] text-purple-300/70 mt-1 block font-mono">Tamper-Proof Logs</span>
          </div>

          <div className="bg-[#100422] border border-[#7b2cbf]/50 p-4 rounded-2xl hover:border-[#9d4edd] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-300/80">Threats Blocked</span>
              <div className="w-8 h-8 rounded-xl bg-[#3c096c]/70 border border-[#7b2cbf]/60 flex items-center justify-center text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-rose-400">
              {metrics.threatsBlockedCount}
            </div>
            <span className="text-[11px] text-rose-300/80 mt-1 block font-mono">Deceptive Trackers Stopped</span>
          </div>

          <div className="bg-[#100422] border border-[#7b2cbf]/50 p-4 rounded-2xl hover:border-[#9d4edd] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-purple-300/80">Verified CMPs</span>
              <div className="w-8 h-8 rounded-xl bg-[#3c096c]/70 border border-[#7b2cbf]/60 flex items-center justify-center text-emerald-400">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {metrics.whitelistedCMPs}
            </div>
            <span className="text-[11px] text-purple-300/70 mt-1 block font-mono">Trusted Providers</span>
          </div>
        </div>
      </div>

      {/* Main Container Card 2: Interactive Form */}
      <div className="bg-[#1a0933] border-2 border-[#8b31ff] rounded-[24px] p-6 shadow-2xl space-y-5 relative">
        <div>
          <div className="inline-block bg-[#8b31ff] text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-2">
            TEST A COOKIE CONSENT DECISION
          </div>
          <p className="text-xs text-purple-200/80">
            Test how a website cookie choice is verified against dark patterns and saved into an immutable audit record.
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-[#100422] border border-[#8b31ff] text-xs text-purple-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="h-4 w-4 text-[#c084fc] shrink-0" />
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
                className="w-full bg-[#0c0318] border border-[#7b2cbf]/60 focus:border-[#a855f7] rounded-xl px-4 py-2.5 text-xs text-white placeholder-purple-300/40 focus:outline-none transition-colors"
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
                className="w-full bg-[#0c0318] border border-[#7b2cbf]/60 focus:border-[#a855f7] rounded-xl px-4 py-2.5 text-xs text-white placeholder-purple-300/40 focus:outline-none transition-colors"
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
                className="w-full bg-[#0c0318] border border-[#7b2cbf]/60 focus:border-[#a855f7] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
              >
                <option value="necessary">Necessary (Essential for Site)</option>
                <option value="optional">Optional (Analytics / Marketing)</option>
                <option value="all">Bundled (All Cookies)</option>
                <option value="suspicious">Suspicious (Dark Pattern / Tracker)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1.5">
                Your Consent Choice
              </label>
              <select
                value={consentAction}
                onChange={(e) => setConsentAction(e.target.value as ConsentAction)}
                className="w-full bg-[#0c0318] border border-[#7b2cbf]/60 focus:border-[#a855f7] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
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
              className="px-6 py-2.5 rounded-full bg-[#8b31ff] hover:bg-[#7c3aed] text-xs font-bold text-white shadow-lg shadow-purple-950/80 transition-all cursor-pointer flex items-center gap-2"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Saving Record...' : 'Save & Record Privacy Choice'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Container Card 3: Saved Privacy Decisions Table */}
      <div className="bg-[#1a0933] border-2 border-[#8b31ff] rounded-[24px] overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#7b2cbf]/50 flex items-center justify-between bg-[#100422]">
          <div>
            <div className="inline-block bg-[#8b31ff] text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md mb-1">
              SAVED PRIVACY DECISIONS
            </div>
            <p className="text-xs text-purple-200/80 mt-1">
              History of recorded website cookie choices and smart security guidance.
            </p>
          </div>
          <span className="text-xs font-mono text-[#d8b4fe] bg-[#0c0318] px-3 py-1 rounded-full border border-[#7b2cbf]/60">
            {recentEvents.length} Total Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c0318] text-purple-300 font-mono text-[11px] uppercase tracking-wider border-b border-[#7b2cbf]/50">
              <tr>
                <th className="py-3.5 px-5">Record ID</th>
                <th className="py-3.5 px-5">Website Domain</th>
                <th className="py-3.5 px-5">Security Fingerprint</th>
                <th className="py-3.5 px-5">Security Status</th>
                <th className="py-3.5 px-5">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c096c]/40">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-purple-300/60 text-xs">
                    No privacy decisions recorded yet. Test an event above or use the simulator.
                  </td>
                </tr>
              ) : (
                recentEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#280d4a]/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[#c084fc] font-semibold">{ev.id}</td>
                    <td className="py-3.5 px-5 font-medium text-white">{ev.site_domain}</td>
                    <td className="py-3.5 px-5 font-mono text-purple-200/80" title={ev.cookie_hash}>
                      {truncateHash(ev.cookie_hash, 6, 6)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                          ev.verification_result === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : ev.verification_result === 'Warning'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-500/20 text-[#d8b4fe] border border-purple-500/40'
                        }`}
                      >
                        {ev.verification_result}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-purple-100 font-medium">{ev.guidance_shown}</td>
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
