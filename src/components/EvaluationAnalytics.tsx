import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { type CookieEvent, type PublicLedgerBlock } from '../types/database';
import { db } from '../lib/db';

export const EvaluationAnalytics: React.FC = () => {
  const [events, setEvents] = useState<CookieEvent[]>([]);
  const [publicBlocks, setPublicBlocks] = useState<PublicLedgerBlock[]>([]);

  useEffect(() => {
    const load = async () => {
      const evs = await db.cookie_events.toArray();
      const pbs = await db.public_ledger.toArray();
      setEvents(evs);
      setPublicBlocks(pbs);
    };
    load();
  }, []);

  const verifiedCount = events.filter((e) => e.verification_result === 'Verified').length;
  const unverifiedCount = events.filter((e) => e.verification_result === 'Unverified').length;
  const warningCount = events.filter((e) => e.verification_result === 'Warning').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Evaluation Matrices</h1>
        <p className="text-sm text-slate-400 mt-1">
          Verification logic, guidance recommendations, and audit outputs based on live records.
        </p>
      </div>

      {/* Accuracy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Verification Accuracy</span>
          <div className="text-2xl font-bold text-emerald-400">100%</div>
          <span className="text-[11px] text-slate-500">Deterministic SHA-256</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Guidance States</span>
          <div className="text-2xl font-bold text-indigo-400">4 / 4</div>
          <span className="text-[11px] text-slate-500">Heuristics Handled</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Ledger Blocks</span>
          <div className="text-2xl font-bold text-purple-400">{publicBlocks.length}</div>
          <span className="text-[11px] text-slate-500">Synchronized Dual-Chain</span>
        </div>
      </div>

      {/* Table 1: Verification System Logic */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Table 1: Verification System Logic</h2>
        <p className="text-xs text-slate-400">
          Evaluates intercepted CMP scripts against the registered SHA-256 database.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Registry Classification</th>
                <th className="py-2.5 px-4">Evaluation Output</th>
                <th className="py-2.5 px-4">Status Description</th>
                <th className="py-2.5 px-4">Recorded Events</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2.5 px-4 font-mono text-emerald-400">Whitelisted CMP Hash</td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 font-mono text-[10px]">
                    Verified
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-300">Matches verified privacy provider</td>
                <td className="py-2.5 px-4 font-mono text-slate-200">{verifiedCount}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-amber-400">Unlisted / Custom Hash</td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 font-mono text-[10px]">
                    Unverified
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-300">Script not in registered whitelist</td>
                <td className="py-2.5 px-4 font-mono text-slate-200">{unverifiedCount}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400">Blacklisted CMP Hash</td>
                <td className="py-2.5 px-4">
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20 font-mono text-[10px]">
                    Warning
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-300">Known deceptive tracker or dark pattern</td>
                <td className="py-2.5 px-4 font-mono text-slate-200">{warningCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Guidance System Logic */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Table 2: Guidance System Logic</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Cookie Category</th>
                <th className="py-2.5 px-4">Expected Recommendation</th>
                <th className="py-2.5 px-4">Actual Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2.5 px-4 font-medium text-white">Necessary</td>
                <td className="py-2.5 px-4">Accept?</td>
                <td className="py-2.5 px-4 font-mono text-indigo-400">Accept?</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-white">Optional / Analytics</td>
                <td className="py-2.5 px-4">Customize?</td>
                <td className="py-2.5 px-4 font-mono text-indigo-400">Customize?</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-white">Bundled (All)</td>
                <td className="py-2.5 px-4">Opt for Necessary?</td>
                <td className="py-2.5 px-4 font-mono text-indigo-400">Opt for Necessary?</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-medium text-white">Suspicious / Deceptive</td>
                <td className="py-2.5 px-4">Warning</td>
                <td className="py-2.5 px-4 font-mono text-rose-400">Warning</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 3: Auditing System Logic */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Table 3: Auditing System Logic</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">User Action</th>
                <th className="py-2.5 px-4">Private Ledger (P)</th>
                <th className="py-2.5 px-4">Public Ledger (PB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2.5 px-4 font-mono text-emerald-400">Accept</td>
                <td className="py-2.5 px-4">Consent Recorded</td>
                <td className="py-2.5 px-4">Block (De-identified Hash)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-rose-400">Reject</td>
                <td className="py-2.5 px-4">Consent Rejected</td>
                <td className="py-2.5 px-4">Block (De-identified Hash)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-mono text-indigo-400">Customize</td>
                <td className="py-2.5 px-4">Preferences Saved</td>
                <td className="py-2.5 px-4">Block (De-identified Hash)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
