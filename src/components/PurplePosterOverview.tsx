import React from 'react';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  PieChart,
  BarChart3,
  Scale,
  Building2,
  Users2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { type CookieEvent, type User, type CookieType, type ConsentAction } from '../types/database';
import { truncateHash, sha256 } from '../lib/crypto';
import { recordConsentTransaction } from '../lib/db';

interface PurplePosterOverviewProps {
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

export const PurplePosterOverview: React.FC<PurplePosterOverviewProps> = ({
  metrics,
  recentEvents,
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  // Custom Transaction Form State
  const [domainInput, setDomainInput] = React.useState('e-commerce-shop.com');
  const [scriptTextInput, setScriptTextInput] = React.useState('https://cdn.onetrust.com/consent/v2/otSDKStub.js');
  const [cookieType, setCookieType] = React.useState<CookieType>('necessary');
  const [consentAction, setConsentAction] = React.useState<ConsentAction>('accept');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

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
        `Block #${result.publicBlock.block_index} chained: SHA-256 hash ${truncateHash(result.publicBlock.hash, 8, 8)} mined into ledger.`
      );
      await onRefreshData();
    } catch (err) {
      console.error('Failed to record transaction:', err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER (Exact Style from Science Fair Research Poster)     */}
      {/* ========================================================================= */}
      <div className="rounded-[28px] bg-gradient-to-r from-[#ebd5ff] via-[#f5e8ff] to-[#fae8ff] p-5 sm:p-7 border-4 border-[#c084fc] shadow-2xl shadow-purple-950/60 flex flex-col md:flex-row items-center gap-6 text-[#1e0a3c] relative overflow-hidden">
        {/* Subtle dot matrix overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#7e22ce_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none" />

        {/* Circular Shield Emblem */}
        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-[#1e0836] via-[#3b0764] to-[#581c87] p-1.5 shadow-xl border-4 border-[#a855f7] flex items-center justify-center shrink-0">
          <div className="h-full w-full rounded-full border-2 border-dashed border-[#d8b4fe] flex items-center justify-center bg-[#0d031c]">
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-[#c084fc] drop-shadow-[0_0_15px_rgba(192,132,252,0.9)]" />
          </div>
        </div>

        {/* Banner Title Box */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="inline-block px-5 py-2 rounded-2xl bg-[#ffffff] border-4 border-[#9333ea] shadow-md">
            <h1 className="text-2xl sm:text-4xl font-black text-[#581c87] tracking-wider uppercase font-pixel leading-none">
              CRYPTICOOKIE :
            </h1>
          </div>
          <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c026d3] text-white shadow-md">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              HYBRID BLOCKCHAIN-BASED CONSENT VERIFICATION, GUIDANCE, AND AUDITING SYSTEMS FOR CURBING DARK PATTERN RISKS
            </p>
          </div>
          <div className="text-[11px] font-bold text-[#6b21a8] flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5 font-mono">
            <span>Porfirio G. Comia MNHS</span>
            <span>&bull;</span>
            <span>Division Science Fair</span>
            <span>&bull;</span>
            <span className="text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
              30 Respondents (100% Yes)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#7e22ce] to-[#9333ea] hover:from-[#6b21a8] hover:to-[#7e22ce] text-white shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Extension Simulator</span>
          </button>
          <button
            onClick={() => onNavigateTab('blockchain')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ffffff] hover:bg-purple-50 text-[#6b21a8] border-2 border-[#9333ea] shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Blockchain Explorer</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SIGNIFICANCE OF THE STUDY & ABSTRACT POSTER CARDS                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SIGNIFICANCE OF THE STUDY (SDG 16, SDG 9, SDG 17) - 6 cols */}
        <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-[#270d4a] via-[#1c0838] to-[#120424] border-2 border-[#a855f7]/50 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white font-pixel text-xs sm:text-sm font-black shadow tracking-wider uppercase">
            SIGNIFICANCE OF THE STUDY
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* SDG 16 */}
            <div className="rounded-2xl bg-[#3b1263]/80 border-2 border-[#c084fc]/50 p-3.5 text-center space-y-1.5 hover:border-purple-300 transition-colors">
              <div className="h-8 w-8 mx-auto rounded-lg bg-[#a855f7]/30 flex items-center justify-center font-bold text-xs text-[#e9d5ff]">
                <Scale className="h-4 w-4 text-[#e9d5ff]" />
              </div>
              <div className="text-xs font-extrabold text-[#f3e8ff]">SDG #16</div>
              <div className="text-[11px] text-purple-200 leading-snug font-medium">
                Peace, Justice, and Strong Institutions
              </div>
            </div>

            {/* SDG 9 */}
            <div className="rounded-2xl bg-[#3b1263]/80 border-2 border-[#c084fc]/50 p-3.5 text-center space-y-1.5 hover:border-purple-300 transition-colors">
              <div className="h-8 w-8 mx-auto rounded-lg bg-[#a855f7]/30 flex items-center justify-center font-bold text-xs text-[#e9d5ff]">
                <Building2 className="h-4 w-4 text-[#e9d5ff]" />
              </div>
              <div className="text-xs font-extrabold text-[#f3e8ff]">SDG #9</div>
              <div className="text-[11px] text-purple-200 leading-snug font-medium">
                Industry, Innovation, and Infrastructure
              </div>
            </div>

            {/* SDG 17 */}
            <div className="rounded-2xl bg-[#3b1263]/80 border-2 border-[#c084fc]/50 p-3.5 text-center space-y-1.5 hover:border-purple-300 transition-colors">
              <div className="h-8 w-8 mx-auto rounded-lg bg-[#a855f7]/30 flex items-center justify-center font-bold text-xs text-[#e9d5ff]">
                <Users2 className="h-4 w-4 text-[#e9d5ff]" />
              </div>
              <div className="text-xs font-extrabold text-[#f3e8ff]">SDG #17</div>
              <div className="text-[11px] text-purple-200 leading-snug font-medium">
                Partnerships for the Goals
              </div>
            </div>
          </div>

          <p className="text-xs text-purple-200/90 leading-relaxed font-medium bg-[#1e0a38]/90 p-3.5 rounded-2xl border border-purple-800/70">
            Provides a decentralized, transparent defense against deceptive consent practices that compromise digital autonomy and institutional trust.
          </p>
        </div>

        {/* ABSTRACT (Exact wording & purple container from poster) - 6 cols */}
        <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-[#f3e8ff] to-[#ebd5ff] border-4 border-[#c084fc] p-5 sm:p-6 shadow-xl space-y-3 text-[#1e0a3c]">
          <div className="inline-block px-4 py-1.5 rounded-xl bg-[#581c87] text-white font-pixel text-xs sm:text-sm font-black shadow tracking-wider uppercase">
            ABSTRACT
          </div>

          <div className="text-xs sm:text-[13px] text-[#3b0764] leading-relaxed space-y-2 font-medium font-mono">
            <p>
              The need for an audit system that is immutable and clear for cookie consent is growing as generating proof for cookie-induced data breaches is complex.
            </p>
            <p>
              On account of that, this study investigates the development of a hybrid blockchain-based consent verification, guidance, and auditing system.
            </p>
            <div className="bg-[#ffffff] p-3 rounded-xl border-2 border-[#9333ea] text-[#581c87] font-bold shadow-sm">
              When it came to rating the 3 systems as a whole as Crypticookie, it also got <span className="text-[#9333ea] underline decoration-wavy font-black">30 of our respondents to say "Yes"</span> leading to it having <span className="text-[#9333ea] font-black">100% in ratings or interpreted as "Highly Effective"</span>.
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. 25% UMBRA STATISTIC & OBJECTIVES                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Background of Study: 25% Dark Pattern Risk - 7 cols */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-r from-[#2e0854] via-[#3b0764] to-[#1f0538] border-2 border-[#c084fc]/60 p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center sm:text-left shrink-0">
            <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#f472b6] via-[#c084fc] to-[#60a5fa] font-pixel drop-shadow">
              25%
            </div>
            <div className="text-[10px] font-mono text-purple-300 uppercase tracking-widest mt-1">
              Revocation Barriers
            </div>
          </div>
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-lg bg-[#9333ea]/60 text-white text-[11px] font-pixel uppercase tracking-wide border border-purple-400/40">
              BACKGROUND OF THE STUDY
            </div>
            <p className="text-xs sm:text-sm text-purple-100 font-medium leading-relaxed">
              <strong>25% of the 12k tester websites on UMBRA's system</strong> have revocation barriers, enabling third-party tracking even if users click reject cookies.
            </p>
            <div className="text-[11px] text-pink-300 font-mono">
              &bull; Crypticookie solves this through real-time cryptographic DOM script verification and dual-chain Proof-of-Audit logging.
            </div>
          </div>
        </div>

        {/* Objectives 01, 02, 03 - 5 cols */}
        <div className="lg:col-span-5 rounded-3xl bg-[#1e0a38] border-2 border-[#a855f7]/50 p-5 shadow-xl space-y-3">
          <div className="inline-block px-4 py-1 rounded-xl bg-gradient-to-r from-[#7e22ce] to-[#a855f7] text-white font-pixel text-xs font-black uppercase">
            OBJECTIVES
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#2a104f] border border-purple-700/80">
              <span className="h-6 w-6 rounded-full bg-[#9333ea] text-white font-pixel text-[10px] flex items-center justify-center shrink-0 font-bold">
                01
              </span>
              <span className="text-purple-100 font-medium">To evaluate if the verification system works</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#2a104f] border border-purple-700/80">
              <span className="h-6 w-6 rounded-full bg-[#c026d3] text-white font-pixel text-[10px] flex items-center justify-center shrink-0 font-bold">
                02
              </span>
              <span className="text-purple-100 font-medium">To assess the effectiveness of the guidance system</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#2a104f] border border-purple-700/80">
              <span className="h-6 w-6 rounded-full bg-[#3b82f6] text-white font-pixel text-[10px] flex items-center justify-center shrink-0 font-bold">
                03
              </span>
              <span className="text-purple-100 font-medium">To determine the auditing system's ability to log consent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. METHODOLOGY 3 STEPS WORKFLOW                                          */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-[#17062e] border-2 border-[#9333ea]/50 p-6 shadow-xl space-y-4">
        <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#c026d3] text-white font-pixel text-xs sm:text-sm font-black uppercase tracking-wider">
          METHODOLOGY WORKFLOW
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-b from-[#2e0e57] to-[#1b0636] border-2 border-[#a855f7]/40 p-4 space-y-2 relative overflow-hidden">
            <div className="text-2xl font-black text-[#c084fc] font-pixel">01</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-pixel text-[11px]">Platform Selection</div>
            <p className="text-xs text-purple-200 leading-relaxed font-medium">
              After choosing a platform that can be used as a base for the web extension (Manifest V3 + Web API).
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-[#2e0e57] to-[#1b0636] border-2 border-[#a855f7]/40 p-4 space-y-2 relative overflow-hidden">
            <div className="text-2xl font-black text-[#f472b6] font-pixel">02</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-pixel text-[11px]">Add-On Layout & Hashing</div>
            <p className="text-xs text-purple-200 leading-relaxed font-medium">
              Place in the information containing the add-on's layout with its SHA-256 hashing and guidance function.
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-[#2e0e57] to-[#1b0636] border-2 border-[#a855f7]/40 p-4 space-y-2 relative overflow-hidden">
            <div className="text-2xl font-black text-[#60a5fa] font-pixel">03</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider font-pixel text-[11px]">Beta Testing</div>
            <p className="text-xs text-purple-200 leading-relaxed font-medium">
              Lastly, analyze the web-extension by beta testing across 30 respondent trials on live websites.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RESULTS AND DISCUSSION TABLES & STATS                                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Results & Tables - 8 cols */}
        <div className="lg:col-span-8 rounded-3xl bg-[#1d0738] border-2 border-[#c084fc]/60 p-6 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#f43f5e] text-white font-pixel text-xs sm:text-sm font-black uppercase">
              RESULTS AND DISCUSSION
            </div>
            <span className="text-xs font-mono text-emerald-300 font-bold bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/40">
              ✓ 100% Effective Benchmark
            </span>
          </div>

          {/* Table 1 & 2 Benchmark Matrix */}
          <div className="overflow-x-auto rounded-xl border border-purple-800/80">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="bg-[#381068] text-purple-200 border-b border-purple-700">
                  <th className="p-3">Type of Cookie</th>
                  <th className="p-3">Expected Recommendation</th>
                  <th className="p-3">Actual Output</th>
                  <th className="p-3">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/60 text-purple-100">
                <tr className="bg-[#240a4b]/60">
                  <td className="p-3 font-bold text-white">Necessary Cookies</td>
                  <td className="p-3 text-emerald-300">Displays "Accept"</td>
                  <td className="p-3 font-bold text-emerald-400">Accept?</td>
                  <td className="p-3 text-emerald-400 font-bold">Responded correctly</td>
                </tr>
                <tr className="bg-[#1c063c]/60">
                  <td className="p-3 font-bold text-white">Optional Cookies</td>
                  <td className="p-3 text-blue-300">Displays "Customize?"</td>
                  <td className="p-3 font-bold text-blue-400">Customize?</td>
                  <td className="p-3 text-emerald-400 font-bold">Responded correctly</td>
                </tr>
                <tr className="bg-[#240a4b]/60">
                  <td className="p-3 font-bold text-white">Suspicious Cookies</td>
                  <td className="p-3 text-rose-300">Displays "Warning"</td>
                  <td className="p-3 font-bold text-rose-400">Warning</td>
                  <td className="p-3 text-emerald-400 font-bold">Responded correctly</td>
                </tr>
                <tr className="bg-[#1c063c]/60">
                  <td className="p-3 font-bold text-white">All Cookies</td>
                  <td className="p-3 text-purple-300">Displays "Opt for Necessary?"</td>
                  <td className="p-3 font-bold text-purple-400">Opt for Necessary?</td>
                  <td className="p-3 text-emerald-400 font-bold">Responded correctly</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Respondent Matrix from Science Fair */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center font-mono">
            <div className="bg-[#2d0f5c] p-2.5 rounded-xl border border-purple-700">
              <div className="text-[10px] text-purple-300">Verification System</div>
              <div className="text-sm font-bold text-white">30 Yes / 0 No</div>
              <div className="text-[10px] text-emerald-400 font-bold">100% Effective</div>
            </div>
            <div className="bg-[#2d0f5c] p-2.5 rounded-xl border border-purple-700">
              <div className="text-[10px] text-purple-300">Guidance System</div>
              <div className="text-sm font-bold text-white">30 Yes / 0 No</div>
              <div className="text-[10px] text-emerald-400 font-bold">100% Effective</div>
            </div>
            <div className="bg-[#2d0f5c] p-2.5 rounded-xl border border-purple-700">
              <div className="text-[10px] text-purple-300">Auditing System</div>
              <div className="text-sm font-bold text-white">30 Yes / 0 No</div>
              <div className="text-[10px] text-emerald-400 font-bold">100% Effective</div>
            </div>
            <div className="bg-[#2d0f5c] p-2.5 rounded-xl border border-purple-700">
              <div className="text-[10px] text-purple-300">Overall Rating</div>
              <div className="text-sm font-bold text-white">30/30 Respondents</div>
              <div className="text-[10px] text-emerald-400 font-bold">Highly Effective</div>
            </div>
          </div>
        </div>

        {/* CONCLUSION & BIBLIOGRAPHY - 4 cols */}
        <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-[#f3e8ff] to-[#fae8ff] border-4 border-[#c084fc] p-5 sm:p-6 shadow-xl space-y-4 text-[#1e0a3c] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-xl bg-[#581c87] text-white font-pixel text-xs sm:text-sm font-black shadow tracking-wider uppercase">
              CONCLUSION
            </div>
            <p className="text-xs text-[#3b0764] leading-relaxed font-mono font-medium">
              In summary, this study proves that the hybrid blockchain-based consent management system in the form of a browser extension has the potential to be a practical, immutable, and technical solution for tracking deceptive cookie banners, while promoting cybersecurity and accountability.
            </p>
          </div>

          <div className="pt-4 border-t-2 border-[#d8b4fe] space-y-1">
            <div className="text-[10px] font-bold text-[#581c87] uppercase font-pixel">
              BIBLIOGRAPHY
            </div>
            <p className="text-[10px] text-[#6b21a8] leading-tight font-mono">
              Singh, N., Jin, S., & Kim, H. (2026). Unveiling Evolving Dark Patterns in Cookie Consent Banners. arXiv:2603.21515.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. LIVE INTERACTIVE CONSENT TRANSACTION TESTER & LOGGER                   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#200842] via-[#2c0b5c] to-[#1a0538] border-2 border-[#a855f7]/50 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-pink-400" />
              <span>Test a Cookie Consent Decision</span>
            </h2>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Enter any website to test smart privacy recommendations and save a tamper-proof record.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-800">
              Total Saved Records: <strong>{metrics.publicLedgerCount}</strong>
            </span>
          </div>
        </div>

        {successMessage && (
          <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-sm font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleRecordNewEvent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-purple-200 mb-1.5">
              Website Domain
            </label>
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. nytimes.com"
              className="w-full bg-[#120426] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-purple-400/40 focus:outline-none focus:border-pink-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-200 mb-1.5">
              Cookie Banner Script / URL
            </label>
            <input
              type="text"
              value={scriptTextInput}
              onChange={(e) => setScriptTextInput(e.target.value)}
              placeholder="e.g. otSDKStub.js or script URL"
              className="w-full bg-[#120426] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-purple-400/40 focus:outline-none focus:border-pink-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-200 mb-1.5">
              Cookie Risk Category
            </label>
            <select
              value={cookieType}
              onChange={(e) => setCookieType(e.target.value as CookieType)}
              className="w-full bg-[#120426] border border-purple-800/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-pink-400 font-mono cursor-pointer"
            >
              <option value="necessary">Necessary (Accept?)</option>
              <option value="optional">Optional (Customize?)</option>
              <option value="suspicious">Suspicious (Warning)</option>
              <option value="all">All Cookies (Opt for Necessary?)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !domainInput.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-xs font-black text-white rounded-xl shadow-lg shadow-purple-600/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving Decision...' : 'Save Privacy Decision'}</span>
            </button>
          </div>
        </form>

        {/* Saved Privacy Decisions Table in Purple Theme */}
        <div className="border border-purple-800/60 rounded-2xl overflow-hidden bg-[#14052b]/80">
          <div className="p-3.5 border-b border-purple-800/60 flex items-center justify-between bg-[#1b073a]">
            <div>
              <h3 className="text-xs font-bold text-pink-200">Saved Privacy Decisions</h3>
              <p className="text-[11px] text-purple-300/70">
                History of recorded website cookie choices and smart security guidance.
              </p>
            </div>
            <span className="text-[11px] font-mono text-purple-200 bg-[#0d021c] px-2.5 py-0.5 rounded-lg border border-purple-700/50">
              {recentEvents.length} Total Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e021e] text-purple-300 border-b border-purple-800/40 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Record ID</th>
                  <th className="py-2.5 px-4">Website Domain</th>
                  <th className="py-2.5 px-4">Security Fingerprint</th>
                  <th className="py-2.5 px-4">Security Status</th>
                  <th className="py-2.5 px-4">Recommendation</th>
                  <th className="py-2.5 px-4">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/40">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-purple-300/60 text-xs">
                      No privacy decisions recorded yet. Test a website above.
                    </td>
                  </tr>
                ) : (
                  recentEvents.slice(0, 6).map((ev) => (
                    <tr key={ev.id} className="hover:bg-purple-900/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-pink-400">{ev.id}</td>
                      <td className="py-2.5 px-4 font-semibold text-white">{ev.site_domain}</td>
                      <td className="py-2.5 px-4 font-mono text-purple-300" title={ev.cookie_hash}>
                        {truncateHash(ev.cookie_hash, 6, 6)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                            ev.verification_result === 'Verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ev.verification_result === 'Warning'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {ev.verification_result}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-100">{ev.guidance_shown}</td>
                      <td className="py-2.5 px-4 font-mono text-purple-300/80 text-[11px]">
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
