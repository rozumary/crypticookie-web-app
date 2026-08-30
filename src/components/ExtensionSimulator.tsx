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
import { InstallExtensionModal } from './InstallExtensionModal';
import { CrypticookieLogo } from './CrypticookieLogo';

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

  const activeUserId = currentUser ? currentUser.id : 'u_auditor_primary';

  const refreshMonitoredHistory = async () => {
    try {
      const items = await getMonitoredDomains(25, activeUserId);
      setMonitoredHistory(items);
    } catch (e) {
      console.error('Error fetching monitored history:', e);
    }
  };

  useEffect(() => {
    refreshMonitoredHistory();
    const handleSync = () => refreshMonitoredHistory();
    window.addEventListener('crypticookie_db_sync', handleSync);
    return () => window.removeEventListener('crypticookie_db_sync', handleSync);
  }, [activeUserId]);

  // Setup preview state and precalculate hash
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
      // Record immediately to database and Firestore for real-time live sync
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
      }, activeUserId);
      await refreshMonitoredHistory();
      await onRefreshData();
    } catch (err) {
      console.error('Monitored log error:', err);
    } finally {
      setTimeout(() => setIsAuditingDomain(false), 200);
    }
  };

  const handleExecuteConsentAction = async (action: ConsentAction) => {
    try {
      const result = await recordConsentTransaction({
        userId: activeUserId,
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
    await clearMonitoredDomains(activeUserId);
    await refreshMonitoredHistory();
    await onRefreshData();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Active Website & CMP Monitor</span>
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            </h1>
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#1A0935] text-pink-300 border border-pink-500/30 text-[11px] font-mono font-semibold">
              <Radio className="h-3 w-3 text-pink-400 animate-pulse" />
              Live Audit Active
            </span>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Live domain audits and script hashing for <strong className="text-white">{currentUser ? currentUser.username : 'Primary Auditor'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md"
          >
            <Sparkles className="h-4 w-4 text-white" />
            <span>Install to Real Browser</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Interactive Browser Window Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-pink-400" />
            <span>Live Browser Interceptor Window</span>
          </h2>
          <span className="text-xs font-mono font-semibold text-pink-300 bg-[#1A0935] px-3 py-1 rounded-full border border-pink-500/30">
            {currentDomain}
          </span>
        </div>

        {/* Clean Interactive Browser Window Frame */}
        <div className="rounded-2xl border border-[#29154A] bg-[#0A0414] overflow-hidden">
          {/* Browser Top Navigation Toolbar */}
          <div className="flex items-center gap-3 border-b border-[#29154A] bg-[#14082B] px-4 py-3">
            {/* Window dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
              <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
              <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
            </div>

            {/* Clean URL Input Bar */}
            <form onSubmit={handleNavigateManualDomain} className="flex flex-1 items-center gap-2 rounded-xl bg-[#0F061F] px-3.5 py-2 border border-[#29154A] text-xs">
              <Globe className="h-4 w-4 text-pink-400 shrink-0" />
              <span className="text-purple-300/60 font-mono">https://</span>
              <input
                type="text"
                value={currentDomain}
                onChange={(e) => setCurrentDomain(e.target.value)}
                className="w-full bg-transparent text-purple-100 font-mono focus:outline-none placeholder-purple-400/40"
                placeholder="Type any website (e.g. shopee.ph, lazada.com.ph, gcash.com, abs-cbn.com)"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs shrink-0 transition-colors cursor-pointer"
              >
                Inspect & Audit
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
              className="p-2 text-purple-300/70 hover:text-white hover:bg-[#1A0935] rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <RotateCw className={`h-4 w-4 ${isAuditingDomain ? 'animate-spin text-pink-400' : ''}`} />
            </button>
          </div>

          {/* Browser Page Viewport */}
          <div className="p-6 sm:p-8 bg-[#130729] min-h-[380px] flex flex-col justify-between space-y-6">
            {/* Simulated Webpage Header & Sniffed Trackers Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#1A0935] border border-[#29154A]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#250B42] border border-pink-500/30 flex items-center justify-center text-pink-300 font-mono font-bold text-base shrink-0">
                    {currentDomain.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-purple-100">{currentDomain}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#250B42] text-pink-300 border border-pink-500/30">
                        {detectedTrackers.length} Trackers Sniffed
                      </span>
                    </div>
                    <p className="text-xs text-purple-300/70 mt-0.5">
                      Live DOM intercepted • SHA-256 Digest verified against CMP whitelist
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
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : t.category === 'Advertising'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                      }`}
                    >
                      <Cookie className="h-3 w-3 text-pink-400" />
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggleable Technical Details & CMP Registry link */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onNavigateTab('cmp_registry')}
                  className="text-xs text-pink-300 hover:text-white bg-[#1A0935] hover:bg-[#250B42] border border-pink-500/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all font-semibold"
                >
                  <Layers className="h-3.5 w-3.5 text-pink-400" />
                  <span>Inspect CMP in Registry</span>
                </button>

                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-xs text-purple-300/70 hover:text-white flex items-center gap-1 inline-flex cursor-pointer font-medium"
                >
                  <span>{showTechnicalDetails ? 'Hide' : 'Inspect'} Raw Script & Hash</span>
                  {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {showTechnicalDetails && (
                <div className="p-4 rounded-xl bg-[#1A0935] border border-[#29154A] space-y-3 text-xs animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-200 mb-1">CMP Script URL / Intercepted Payload</label>
                    <input
                      type="text"
                      value={scriptInput}
                      onChange={(e) => setScriptInput(e.target.value)}
                      className="w-full bg-[#0F061F] border border-[#29154A] rounded-lg px-3 py-2 text-purple-100 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-purple-300/70">
                    <div className="flex items-center gap-2">
                      <span>SHA-256 Digest:</span>
                      <span className="text-pink-300 font-bold">{truncateHash(currentScriptHash, 16, 16)}</span>
                    </div>
                    <button
                      onClick={handleCopyHash}
                      className="flex items-center gap-1 text-pink-300 hover:text-white cursor-pointer font-semibold"
                    >
                      {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Unified Smart Consent Shield Banner */}
            {bannerVisible ? (
              <div className="rounded-2xl border border-pink-500/40 bg-[#1C093B] p-5 sm:p-6 space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C1258] pb-3">
                  <div className="flex items-center gap-2.5">
                    <CrypticookieLogo size="sm" />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                        <span>Cookie Consent Shield</span>
                        <span className="text-xs font-normal text-purple-300/70 font-mono">({cmpItemName})</span>
                      </h3>
                      <p className="text-xs text-purple-300/70 mt-0.5">
                        Recommendation Engine: <strong className="text-pink-300 font-bold">{guidanceRec}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Status Badge and Close Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                        verificationResult === 'Verified'
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                          : verificationResult === 'Warning'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                          : 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {verificationResult === 'Verified' ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>✓ Whitelist Verified</span>
                        </>
                      ) : verificationResult === 'Warning' ? (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                          <span>⚠ Dark Pattern Risk</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5 text-pink-400" />
                          <span>ℹ Unverified CMP</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={() => setBannerVisible(false)}
                      className="p-1 rounded-lg text-purple-300/70 hover:text-white hover:bg-[#2C1258] transition-colors cursor-pointer"
                      title="Dismiss Shield"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-purple-300/70">
                    Choose your consent preference to record this decision on the hybrid blockchain:
                  </span>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => handleExecuteConsentAction('reject')}
                      className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      Reject Trackers
                    </button>
                    <button
                      onClick={() => handleExecuteConsentAction('customize')}
                      className="px-4 py-2 rounded-xl bg-[#14082B] hover:bg-[#1A0935] text-purple-200 border border-[#29154A] text-xs font-semibold cursor-pointer transition-all"
                    >
                      Customize
                    </button>
                    <button
                      onClick={() => handleExecuteConsentAction('accept')}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                    >
                      Accept Verified
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#1C093B]/60 border border-pink-500/30 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Consent Decision Logged Live</h4>
                <p className="text-xs text-purple-300/70">
                  Decision committed to local block and synchronized across database and dashboard in real time.
                </p>
                <button
                  onClick={() => setBannerVisible(true)}
                  className="mt-2 text-xs text-pink-300 hover:text-white underline cursor-pointer font-semibold"
                >
                  Reset & Change Consent Decision
                </button>
              </div>
            )}

            {/* Transaction Success Toast */}
            {lastCommittedBlock && (
              <div className="rounded-xl border border-pink-500/30 bg-[#1C093B] p-3.5 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2 text-xs text-purple-200 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Block #{lastCommittedBlock.publicIndex} synced to Blockchain ({truncateHash(lastCommittedBlock.hash, 8, 8)})
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('blockchain')}
                  className="text-xs font-bold text-pink-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>View on Blockchain</span>
                  <Layers className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Live Monitored Domains History Table Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white">Live Monitored Domains History</h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 border border-pink-500/30 font-mono font-semibold">
              {monitoredHistory.length} Logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshMonitoredHistory}
              title="Refresh logs"
              className="p-1.5 rounded-lg bg-[#1A0935] hover:bg-[#250B42] text-purple-200 border border-pink-500/30 text-xs cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5 text-pink-300" />
            </button>
            {monitoredHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#130729] border border-[#29154A] rounded-2xl overflow-hidden">
          {monitoredHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-purple-300/60 font-mono">
              No website monitoring events recorded yet for this account. Type any domain above to start auditing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#29154A] bg-[#1A0935] text-[11px] text-purple-200 font-bold">
                    <th className="py-3 px-4">Domain / Website</th>
                    <th className="py-3 px-4">CMP Script Name</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Trackers</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#261445]">
                  {monitoredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1C0A3B] transition-colors">
                      <td className="py-2.5 px-4 text-purple-100 font-bold flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-pink-400" />
                        <span>{item.domain}</span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-300/70 max-w-[160px] truncate">{item.cmp_name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.verification_result === 'Verified'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                            : item.verification_result === 'Warning'
                            ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-950/70 text-purple-300 border border-purple-500/30'
                        }`}>
                          {item.verification_result}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-200">{item.trackers_count} trackers</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.privacy_risk_level === 'Critical' || item.privacy_risk_level === 'High'
                            ? 'text-rose-300 bg-rose-950/80 border border-rose-800/60'
                            : item.privacy_risk_level === 'Moderate'
                            ? 'text-amber-300 bg-amber-950/80 border border-amber-800/60'
                            : 'text-emerald-300 bg-emerald-950/80 border border-emerald-800/60'
                        }`}>
                          {item.privacy_risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-300/60 text-[10px]">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Real Browser Extension Install Modal */}
      <InstallExtensionModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
};
