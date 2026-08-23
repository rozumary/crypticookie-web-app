import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { type User, type CookieType, type ConsentAction } from '../types/database';
import {
  determineVerificationResult,
  determineGuidance,
  recordConsentTransaction,
} from '../lib/db';
import { sha256, truncateHash } from '../lib/crypto';

interface ExtensionSimulatorProps {
  currentUser: User | null;
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  const [currentDomain, setCurrentDomain] = useState('');
  const [scriptInput, setScriptInput] = useState('');
  const [currentScriptHash, setCurrentScriptHash] = useState('');
  const [currentCookieType, setCurrentCookieType] = useState<CookieType>('necessary');

  const [verificationResult, setVerificationResult] = useState<'Verified' | 'Unverified' | 'Warning'>('Unverified');
  const [cmpItemName, setCmpItemName] = useState('No script intercepted');
  const [guidanceRec, setGuidanceRec] = useState<string>('Enter script or URL to verify');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [lastCommittedBlock, setLastCommittedBlock] = useState<{
    publicIndex: number;
    hash: string;
    action: string;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState(false);

  // Evaluate script hash whenever hash or cookieType changes
  useEffect(() => {
    const evaluate = async () => {
      if (!currentScriptHash) {
        setVerificationResult('Unverified');
        setCmpItemName('No script intercepted');
        setGuidanceRec('Enter script or URL to verify');
        return;
      }
      const { result, cmpItem } = await determineVerificationResult(currentScriptHash);
      setVerificationResult(result);
      setCmpItemName(cmpItem ? cmpItem.cmp_name : 'Unregistered Script');
      const guidance = determineGuidance(currentCookieType, result);
      setGuidanceRec(guidance);
    };
    evaluate();
  }, [currentScriptHash, currentCookieType]);

  const handleComputeCustomHash = async (text: string) => {
    setScriptInput(text);
    if (!text.trim()) {
      setCurrentScriptHash('');
      setBannerVisible(false);
      setShieldActive(false);
      setLastCommittedBlock(null);
      return;
    }
    const computed = await sha256(text.trim());
    setCurrentScriptHash(computed);
    setBannerVisible(true);
    setShieldActive(true);
    setLastCommittedBlock(null);
  };

  const handleExecuteConsentAction = async (action: ConsentAction) => {
    try {
      const userId = currentUser ? currentUser.id : 'u_researcher_default';
      const result = await recordConsentTransaction({
        userId,
        siteDomain: currentDomain.trim().toLowerCase() || 'unspecified-domain.com',
        cookieHash: currentScriptHash || '0000000000000000000000000000000000000000000000000000000000000000',
        cookieType: currentCookieType,
        consentAction: action,
      });

      setLastCommittedBlock({
        publicIndex: result.publicBlock.block_index,
        hash: result.publicBlock.hash,
        action,
      });

      setBannerVisible(false);
      setShieldActive(false);
      await onRefreshData();
    } catch (err) {
      console.error('Error committing consent transaction:', err);
    }
  };

  const handleCopyHash = () => {
    if (!currentScriptHash) return;
    navigator.clipboard.writeText(currentScriptHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Extension Simulator</h1>
        <p className="text-sm text-slate-400 mt-1">
          Test real-time script hashing, CMP registry verification, and blockchain ledger recording for any URL.
        </p>
      </div>

      {/* Simulated Browser Frame */}
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] shadow-xl overflow-hidden">
        {/* Browser Top Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
          </div>

          {/* Browser Address Bar */}
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">https://</span>
            <input
              type="text"
              value={currentDomain}
              onChange={(e) => setCurrentDomain(e.target.value)}
              className="w-full bg-transparent text-slate-200 focus:outline-none font-mono"
              placeholder="domain.com"
            />
          </div>

          <button
            onClick={() => {
              setBannerVisible(true);
              setShieldActive(true);
              setLastCommittedBlock(null);
            }}
            title="Reload Page"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Viewport Content */}
        <div className="p-6 space-y-6 bg-slate-950/60 min-h-[380px] flex flex-col justify-between">
          <div className="space-y-4 max-w-xl">
            <div>
              <h3 className="text-base font-semibold text-white">{currentDomain}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated web page with active Manifest V3 DOM script interceptor.
              </p>
            </div>

            {/* Custom Script input / SHA-256 display */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  CMP Script / URL to Intercept
                </label>
                <input
                  type="text"
                  value={scriptInput}
                  onChange={(e) => handleComputeCustomHash(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder="Enter script text or URL"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>SHA-256:</span>
                  <span className="text-indigo-300">{truncateHash(currentScriptHash, 10, 10)}</span>
                </div>
                <button
                  onClick={handleCopyHash}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Native Banner */}
          {bannerVisible && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-white block">
                    Website Cookie Banner
                  </span>
                  <span className="text-xs text-slate-400">
                    {cmpItemName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteConsentAction('accept')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('reject')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Crypticookie Injected Shield */}
          {shieldActive && (
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Crypticookie Guidance</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    verificationResult === 'Verified'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : verificationResult === 'Warning'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {verificationResult}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Recommended action: <strong className="text-white">{guidanceRec}</strong></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteConsentAction('accept')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    Accept & Chain
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('reject')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    Reject & Chain
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Success */}
          {lastCommittedBlock && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Block #{lastCommittedBlock.publicIndex} committed to blockchain ({truncateHash(lastCommittedBlock.hash, 6, 6)})
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('blockchain')}
                className="text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>View Chain</span>
                <Layers className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
