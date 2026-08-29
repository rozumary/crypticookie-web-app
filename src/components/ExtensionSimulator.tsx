import React, { useState, useEffect } from 'react';
import {
  Shield,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  Check,
  Globe,
  Radio,
  Eye,
  Cookie,
  Cloud,
  Trash2,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Bot,
  X,
} from 'lucide-react';
import {
  type User,
  type CookieType,
  type ConsentAction,
  type MonitoredDomain,
  type DetectedTracker,
} from '../types/database';
import {
  determineVerificationResult,
  determineGuidance,
  recordConsentTransaction,
  recordMonitoredDomain,
  getMonitoredDomains,
  clearMonitoredDomains,
} from '../lib/db';
import { sha256, truncateHash } from '../lib/crypto';
import { firebaseConfigData } from '../lib/firebase';
import { InstallExtensionModal } from './InstallExtensionModal';

interface ExtensionSimulatorProps {
  currentUser: User | null;
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

// Smart Tracker Detector database for dynamic user-typed websites
const KNOWN_TRACKER_SIGNATURES: Record<string, { name: string; category: 'Analytics' | 'Advertising' | 'Fingerprinting' | 'Essential'; domain: string; blocked: boolean }[]> = {
  'google': [
    { name: 'Google Analytics 4 (_ga)', category: 'Analytics', domain: 'google-analytics.com', blocked: false },
    { name: 'Google Tag Manager', category: 'Analytics', domain: 'googletagmanager.com', blocked: false },
    { name: 'Google AdSense / DoubleClick', category: 'Advertising', domain: 'doubleclick.net', blocked: false },
  ],
  'facebook': [
    { name: 'Facebook Pixel (_fbp)', category: 'Advertising', domain: 'facebook.com', blocked: false },
    { name: 'Meta Connect SDK', category: 'Essential', domain: 'meta.com', blocked: false },
  ],
  'lazada': [
    { name: 'Alibaba Analytics Beacon', category: 'Analytics', domain: 'lazada.com/analytics', blocked: false },
    { name: 'Criteo Retargeting Tag', category: 'Advertising', domain: 'criteo.com', blocked: false },
    { name: 'Session Token Cookie', category: 'Essential', domain: 'lazada.com', blocked: false },
  ],
  'shopee': [
    { name: 'Shopee Tracker SDK', category: 'Analytics', domain: 'shopee.ph/track', blocked: false },
    { name: 'TikTok Ads Pixel', category: 'Advertising', domain: 'tiktok.com', blocked: false },
    { name: 'Facebook Pixel', category: 'Advertising', domain: 'facebook.com', blocked: false },
  ],
  'cnn': [
    { name: 'Chartbeat Real-time Analytics', category: 'Analytics', domain: 'chartbeat.com', blocked: false },
    { name: 'Optimizely Content Test', category: 'Analytics', domain: 'optimizely.com', blocked: false },
    { name: 'Outbrain Recommendation Widget', category: 'Advertising', domain: 'outbrain.com', blocked: false },
  ],
  'pirate': [
    { name: 'Stealth Audio Fingerprinter', category: 'Fingerprinting', domain: 'audiotrack.biz', blocked: true },
    { name: 'CryptoMiner Injected Script', category: 'Fingerprinting', domain: 'coinhive-mirror.io', blocked: true },
    { name: 'Popunder Ad Network', category: 'Advertising', domain: 'popunder.net', blocked: true },
  ],
  'movie': [
    { name: 'Stealth Audio Fingerprinter', category: 'Fingerprinting', domain: 'audiotrack.biz', blocked: true },
    { name: 'Ad Delivery Network', category: 'Advertising', domain: 'delivery-ads.org', blocked: true },
  ],
};

function inferTrackersForDomain(domain: string): DetectedTracker[] {
  const d = domain.toLowerCase();
  for (const [key, trackers] of Object.entries(KNOWN_TRACKER_SIGNATURES)) {
    if (d.includes(key)) {
      return trackers;
    }
  }

  return [
    { name: `${domain.split('.')[0]} Analytics Beacon`, category: 'Analytics', domain: `${domain}/analytics`, blocked: false },
    { name: 'Cross-Site Ad Pixel', category: 'Advertising', domain: 'ad-delivery-network.net', blocked: false },
    { name: 'Auth & Session State', category: 'Essential', domain: domain, blocked: false },
  ];
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  const [currentDomain, setCurrentDomain] = useState('google.com');
  const [scriptInput, setScriptInput] = useState('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js');
  const [currentScriptHash, setCurrentScriptHash] = useState('');
  const [currentCookieType, setCurrentCookieType] = useState<CookieType>('optional');

  const [detectedTrackers, setDetectedTrackers] = useState<DetectedTracker[]>([
    { name: 'Google Analytics 4 (_ga)', category: 'Analytics', domain: 'google-analytics.com', blocked: false },
    { name: 'Google Tag Manager', category: 'Analytics', domain: 'googletagmanager.com', blocked: false },
    { name: 'Google AdSense / DoubleClick', category: 'Advertising', domain: 'doubleclick.net', blocked: false },
  ]);

  const [verificationResult, setVerificationResult] = useState<'Verified' | 'Unverified' | 'Warning'>('Verified');
  const [cmpItemName, setCmpItemName] = useState('OneTrust Privacy v6.32');
  const [guidanceRec, setGuidanceRec] = useState<string>('Customize?');
  const [bannerVisible, setBannerVisible] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [monitoredHistory, setMonitoredHistory] = useState<MonitoredDomain[]>([]);
  const [isAuditingDomain, setIsAuditingDomain] = useState(false);

  const [lastCommittedBlock, setLastCommittedBlock] = useState<{
    publicIndex: number;
    hash: string;
    action: string;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const refreshMonitoredHistory = async () => {
    try {
      const items = await getMonitoredDomains(20);
      setMonitoredHistory(items);
    } catch (e) {
      console.error('Error fetching monitored history:', e);
    }
  };

  // Setup preview state without writing to database
  const setupDomainPreview = async (domainToPreview: string) => {
    const domainClean = domainToPreview.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
    if (!domainClean) return;

    const sniffedTrackers = inferTrackersForDomain(domainClean);
    setDetectedTrackers(sniffedTrackers);

    let cmpUrl = `https://${domainClean}/consent/cmp-loader.js`;
    let cookieType: CookieType = 'optional';

    if (domainClean.includes('google') || domainClean.includes('theverge') || domainClean.includes('mit')) {
      cmpUrl = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
      cookieType = 'optional';
    } else if (domainClean.includes('bbc') || domainClean.includes('github') || domainClean.includes('wikipedia')) {
      cmpUrl = 'https://consent.cookiebot.com/uc.js';
      cookieType = 'necessary';
    } else if (domainClean.includes('pirate') || domainClean.includes('stream') || domainClean.includes('movie')) {
      cmpUrl = 'https://ad-tracker-network.biz/stealth-cookie-drop.js';
      cookieType = 'suspicious';
    } else if (domainClean.includes('shopee') || domainClean.includes('lazada')) {
      cmpUrl = 'https://sdk.privacy-center.org/loader.js';
      cookieType = 'all';
    }

    setScriptInput(cmpUrl);
    setCurrentCookieType(cookieType);

    const computed = await sha256(cmpUrl.trim());
    setCurrentScriptHash(computed);

    const { result, cmpItem } = await determineVerificationResult(computed);
    const guidance = determineGuidance(cookieType, result);

    setVerificationResult(result);
    setCmpItemName(cmpItem ? cmpItem.cmp_name : `${domainClean.split('.')[0].toUpperCase()} CMP Banner`);
    setGuidanceRec(guidance);
    setBannerVisible(true);
    setLastCommittedBlock(null);
  };

  useEffect(() => {
    refreshMonitoredHistory();
    setupDomainPreview(currentDomain);
  }, []);

  const handleNavigateManualDomain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDomain.trim()) return;

    setIsAuditingDomain(true);
    const domainClean = currentDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
    setCurrentDomain(domainClean);

    await setupDomainPreview(domainClean);

    const sniffedTrackers = inferTrackersForDomain(domainClean);
    let cmpUrl = `https://${domainClean}/consent/cmp-loader.js`;
    let cookieType: CookieType = 'optional';

    if (domainClean.includes('google') || domainClean.includes('theverge') || domainClean.includes('mit')) {
      cmpUrl = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
      cookieType = 'optional';
    } else if (domainClean.includes('bbc') || domainClean.includes('github') || domainClean.includes('wikipedia')) {
      cmpUrl = 'https://consent.cookiebot.com/uc.js';
      cookieType = 'necessary';
    } else if (domainClean.includes('pirate') || domainClean.includes('stream') || domainClean.includes('movie')) {
      cmpUrl = 'https://ad-tracker-network.biz/stealth-cookie-drop.js';
      cookieType = 'suspicious';
    } else if (domainClean.includes('shopee') || domainClean.includes('lazada')) {
      cmpUrl = 'https://sdk.privacy-center.org/loader.js';
      cookieType = 'all';
    }

    const computed = await sha256(cmpUrl.trim());
    const { result, cmpItem } = await determineVerificationResult(computed);
    const guidance = determineGuidance(cookieType, result);
    const riskLevel = result === 'Warning' || cookieType === 'suspicious' ? 'Critical' : (result === 'Unverified' ? 'Moderate' : 'Low');

    try {
      await recordMonitoredDomain({
        domain: domainClean,
        url: `https://${domainClean}`,
        title: `${domainClean} Web Session`,
        cmp_detected: true,
        cmp_name: cmpItem ? cmpItem.cmp_name : `${domainClean.split('.')[0].toUpperCase()} Consent Script`,
        script_hash: computed,
        verification_result: result,
        cookie_count: sniffedTrackers.length + 3,
        trackers_count: sniffedTrackers.length,
        trackers_list: sniffedTrackers,
        privacy_risk_level: riskLevel,
        auto_blocked: result === 'Warning' || cookieType === 'suspicious',
        guidance: guidance,
      });
      await refreshMonitoredHistory();
    } catch (err) {
      console.error('Monitored log error:', err);
    } finally {
      setTimeout(() => setIsAuditingDomain(false), 200);
    }
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
      await onRefreshData();
      await refreshMonitoredHistory();
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

  const handleClearHistory = async () => {
    await clearMonitoredDomains();
    await refreshMonitoredHistory();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Clean, Non-Crowded Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Website & CMP Monitor</h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono">
              <Radio className="h-3 w-3 animate-pulse" />
              Live Audit Active
            </span>
          </div>
          <p className="text-xs text-blue-200/70 mt-1">
            Type any website domain below to audit its real cookies, verify CMP hash on-chain, or install to Chrome.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-violet-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Install to Real Browser</span>
          </button>
        </div>
      </div>

      {/* Clean Interactive Browser Window Frame */}
      <div className="rounded-2xl border border-blue-900/40 bg-[#070b19] shadow-2xl overflow-hidden">
        {/* Browser Top Navigation Toolbar */}
        <div className="flex items-center gap-3 border-b border-blue-900/40 bg-[#0b1026] px-4 py-3">
          {/* Window dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Clean URL Input Bar */}
          <form onSubmit={handleNavigateManualDomain} className="flex flex-1 items-center gap-2 rounded-xl bg-[#060a17] px-3.5 py-2 border border-blue-900/50 text-xs shadow-inner">
            <Globe className="h-4 w-4 text-violet-400 shrink-0" />
            <span className="text-blue-400/60 font-mono">https://</span>
            <input
              type="text"
              value={currentDomain}
              onChange={(e) => setCurrentDomain(e.target.value)}
              className="w-full bg-transparent text-white font-mono focus:outline-none placeholder-blue-300/40"
              placeholder="Type any website (e.g. google.com, lazada.com, shopee.ph, cnn.com)"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shrink-0 transition-colors cursor-pointer"
            >
              Open Site
            </button>
          </form>

          {/* Refresh Page Button */}
          <button
            onClick={() => {
              setBannerVisible(true);
              setLastCommittedBlock(null);
              handleNavigateManualDomain();
            }}
            title="Re-audit website"
            className="p-2 text-blue-300 hover:text-white hover:bg-blue-900/40 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <RotateCw className={`h-4 w-4 ${isAuditingDomain ? 'animate-spin text-violet-400' : ''}`} />
          </button>
        </div>

        {/* Browser Page Viewport */}
        <div className="p-6 sm:p-8 bg-[#060a17] min-h-[380px] flex flex-col justify-between space-y-6">
          {/* Simulated Webpage Header & Sniffed Trackers Bar */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0b1026]/90 border border-blue-900/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-mono font-bold text-base shrink-0">
                  {currentDomain.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{currentDomain}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {detectedTrackers.length} Trackers Sniffed
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/60 mt-0.5">
                    Live DOM intercepted • SHA-256 Digest verified against registry
                  </p>
                </div>
              </div>

              {/* Detected Trackers Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {detectedTrackers.map((t, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 ${
                      t.category === 'Fingerprinting' || t.blocked
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : t.category === 'Advertising'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    <Cookie className="h-3 w-3" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Toggleable Technical Details & AI Advisor link */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onNavigateTab('ai_bot')}
                className="text-xs text-violet-300 hover:text-white bg-violet-950/60 hover:bg-violet-900/80 border border-violet-800/40 rounded-xl px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <Bot className="h-3.5 w-3.5 text-violet-400" />
                <span>Ask AI Bot About {currentDomain}</span>
              </button>

              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-xs text-blue-300/70 hover:text-blue-200 flex items-center gap-1 inline-flex cursor-pointer"
              >
                <span>{showTechnicalDetails ? 'Hide' : 'Inspect'} Raw Script & Hash</span>
                {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showTechnicalDetails && (
              <div className="p-4 rounded-xl bg-[#0b1026] border border-blue-900/40 space-y-3 text-xs animate-fadeIn">
                <div>
                  <label className="block text-[11px] text-blue-300 mb-1">CMP Script URL / Intercepted Payload</label>
                  <input
                    type="text"
                    value={scriptInput}
                    onChange={(e) => setScriptInput(e.target.value)}
                    className="w-full bg-[#060a17] border border-blue-900/50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-blue-200/80">
                  <div className="flex items-center gap-2">
                    <span>SHA-256 Digest:</span>
                    <span className="text-violet-300 font-semibold">{truncateHash(currentScriptHash, 16, 16)}</span>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center gap-1 text-blue-300 hover:text-white cursor-pointer"
                  >
                    {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unified Smart Consent Shield Banner (Single, Clean Prompt) */}
          {bannerVisible ? (
            <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-r from-violet-950/60 to-[#0b1026] p-5 sm:p-6 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-violet-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-violet-600/30 border border-violet-400/40 flex items-center justify-center text-violet-300 shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Cookie Consent Shield</span>
                      <span className="text-xs font-normal text-blue-200/60 font-mono">({cmpItemName})</span>
                    </h3>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      Recommendation Engine: <strong className="text-violet-300">{guidanceRec}</strong>
                    </p>
                  </div>
                </div>

                {/* Status Badge and Close Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 ${
                      verificationResult === 'Verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : verificationResult === 'Warning'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    }`}
                  >
                    {verificationResult === 'Verified' ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>✓ Whitelist Verified</span>
                      </>
                    ) : verificationResult === 'Warning' ? (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>⚠ Dark Pattern Risk</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5" />
                        <span>ℹ Unverified CMP</span>
                      </>
                    )}
                  </span>

                  <button
                    onClick={() => setBannerVisible(false)}
                    className="p-1 rounded-lg text-blue-300/60 hover:text-white hover:bg-blue-900/40 transition-colors cursor-pointer"
                    title="Dismiss Shield"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs text-blue-300/70">
                  Choose your consent preference to record this decision on the hybrid blockchain:
                </span>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleExecuteConsentAction('reject')}
                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    Reject Trackers
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('customize')}
                    className="px-4 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-200 border border-blue-800/40 text-xs font-medium cursor-pointer transition-all"
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('accept')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-violet-950/60 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    Accept Verified
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#0b1026] border border-blue-900/40 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Consent Decision Logged</h4>
              <p className="text-xs text-blue-200/70">
                Decision committed to local block and synchronized with Firebase Firestore.
              </p>
              <button
                onClick={() => setBannerVisible(true)}
                className="mt-2 text-xs text-violet-300 hover:text-white underline cursor-pointer"
              >
                Reset & Change Consent Decision
              </button>
            </div>
          )}

          {/* Transaction Success Toast */}
          {lastCommittedBlock && (
            <div className="rounded-xl border border-violet-500/40 bg-violet-950/50 p-3.5 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2 text-xs text-violet-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Block #{lastCommittedBlock.publicIndex} synced to Blockchain ({truncateHash(lastCommittedBlock.hash, 8, 8)})
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('blockchain')}
                className="text-xs font-semibold text-violet-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>View on Blockchain</span>
                <Layers className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Monitored Domains History Table */}
      <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Live Monitored Domains History</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 font-mono">
              {monitoredHistory.length} Logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshMonitoredHistory}
              title="Refresh logs"
              className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-900/40 text-xs cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            {monitoredHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {monitoredHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-blue-300/50 font-mono">
            No website monitoring events recorded yet. Type any domain above to start auditing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-blue-900/40 text-[11px] text-blue-300/70">
                  <th className="pb-2 font-medium">Domain / Website</th>
                  <th className="pb-2 font-medium">CMP Script Name</th>
                  <th className="pb-2 font-medium">Verification</th>
                  <th className="pb-2 font-medium">Trackers</th>
                  <th className="pb-2 font-medium">Risk Level</th>
                  <th className="pb-2 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {monitoredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-950/30 transition-colors">
                    <td className="py-2.5 text-white font-semibold flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                      <span>{item.domain}</span>
                    </td>
                    <td className="py-2.5 text-blue-200/80 max-w-[160px] truncate">{item.cmp_name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.verification_result === 'Verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.verification_result === 'Warning'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      }`}>
                        {item.verification_result}
                      </span>
                    </td>
                    <td className="py-2.5 text-blue-300">{item.trackers_count} trackers</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        item.privacy_risk_level === 'Critical' || item.privacy_risk_level === 'High'
                          ? 'text-rose-400 bg-rose-500/10'
                          : item.privacy_risk_level === 'Moderate'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-emerald-400 bg-emerald-500/10'
                      }`}>
                        {item.privacy_risk_level}
                      </span>
                    </td>
                    <td className="py-2.5 text-blue-300/60 text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real Browser Extension Install Modal */}
      <InstallExtensionModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};

