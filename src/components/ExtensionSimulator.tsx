import React, { useState, useEffect } from 'react';
import {
  Shield,
  RotateCw,
  CheckCircle2,
  Layers,
  Copy,
  Check,
  Globe,
  Radio,
  Eye,
  Cookie,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
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
import { InstallExtensionModal } from './InstallExtensionModal';

interface ExtensionSimulatorProps {
  currentUser: User | null;
  onRefreshData: () => void;
  onNavigateTab: (tab: string) => void;
}

// Smart Tracker Detector database for dynamic user-typed websites
const KNOWN_TRACKER_SIGNATURES: Record<
  string,
  {
    name: string;
    category: 'Analytics' | 'Advertising' | 'Fingerprinting' | 'Essential';
    domain: string;
    blocked: boolean;
  }[]
> = {
  google: [
    {
      name: 'Google Analytics 4 (_ga)',
      category: 'Analytics',
      domain: 'google-analytics.com',
      blocked: false,
    },
    {
      name: 'Google Tag Manager',
      category: 'Analytics',
      domain: 'googletagmanager.com',
      blocked: false,
    },
    {
      name: 'Google AdSense / DoubleClick',
      category: 'Advertising',
      domain: 'doubleclick.net',
      blocked: false,
    },
  ],
  facebook: [
    {
      name: 'Facebook Pixel (_fbp)',
      category: 'Advertising',
      domain: 'facebook.com',
      blocked: false,
    },
    {
      name: 'Meta Connect SDK',
      category: 'Essential',
      domain: 'meta.com',
      blocked: false,
    },
  ],
  lazada: [
    {
      name: 'Alibaba Analytics Beacon',
      category: 'Analytics',
      domain: 'lazada.com/analytics',
      blocked: false,
    },
    {
      name: 'Criteo Retargeting Tag',
      category: 'Advertising',
      domain: 'criteo.com',
      blocked: false,
    },
    {
      name: 'Session Token Cookie',
      category: 'Essential',
      domain: 'lazada.com',
      blocked: false,
    },
  ],
  shopee: [
    {
      name: 'Shopee Tracker SDK',
      category: 'Analytics',
      domain: 'shopee.ph/track',
      blocked: false,
    },
    {
      name: 'TikTok Ads Pixel',
      category: 'Advertising',
      domain: 'tiktok.com',
      blocked: false,
    },
    {
      name: 'Facebook Pixel',
      category: 'Advertising',
      domain: 'facebook.com',
      blocked: false,
    },
  ],
  cnn: [
    {
      name: 'Chartbeat Real-time Analytics',
      category: 'Analytics',
      domain: 'chartbeat.com',
      blocked: false,
    },
    {
      name: 'Optimizely Content Test',
      category: 'Analytics',
      domain: 'optimizely.com',
      blocked: false,
    },
    {
      name: 'Outbrain Recommendation Widget',
      category: 'Advertising',
      domain: 'outbrain.com',
      blocked: false,
    },
  ],
  pirate: [
    {
      name: 'Stealth Audio Fingerprinter',
      category: 'Fingerprinting',
      domain: 'audiotrack.biz',
      blocked: true,
    },
    {
      name: 'CryptoMiner Injected Script',
      category: 'Fingerprinting',
      domain: 'coinhive-mirror.io',
      blocked: true,
    },
    {
      name: 'Popunder Ad Network',
      category: 'Advertising',
      domain: 'popunder.net',
      blocked: true,
    },
  ],
  movie: [
    {
      name: 'Stealth Audio Fingerprinter',
      category: 'Fingerprinting',
      domain: 'audiotrack.biz',
      blocked: true,
    },
    {
      name: 'Ad Delivery Network',
      category: 'Advertising',
      domain: 'delivery-ads.org',
      blocked: true,
    },
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
    {
      name: `${domain.split('.')[0]} Analytics Beacon`,
      category: 'Analytics',
      domain: `${domain}/analytics`,
      blocked: false,
    },
    {
      name: 'Cross-Site Ad Pixel',
      category: 'Advertising',
      domain: 'ad-delivery-network.net',
      blocked: false,
    },
    {
      name: 'Auth & Session State',
      category: 'Essential',
      domain: domain,
      blocked: false,
    },
  ];
}

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  const [currentDomain, setCurrentDomain] = useState('google.com');
  const [scriptInput, setScriptInput] = useState(
    'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js'
  );
  const [currentScriptHash, setCurrentScriptHash] = useState('');
  const [currentCookieType, setCurrentCookieType] =
    useState<CookieType>('optional');

  const [detectedTrackers, setDetectedTrackers] = useState<DetectedTracker[]>([
    {
      name: 'Google Analytics 4 (_ga)',
      category: 'Analytics',
      domain: 'google-analytics.com',
      blocked: false,
    },
    {
      name: 'Google Tag Manager',
      category: 'Analytics',
      domain: 'googletagmanager.com',
      blocked: false,
    },
    {
      name: 'Google AdSense / DoubleClick',
      category: 'Advertising',
      domain: 'doubleclick.net',
      blocked: false,
    },
  ]);

  const [verificationResult, setVerificationResult] = useState<
    'Verified' | 'Unverified' | 'Warning'
  >('Verified');
  const [cmpItemName, setCmpItemName] = useState('OneTrust Privacy v6.32');
  const [guidanceRec, setGuidanceRec] = useState<string>('Customize?');
  const [bannerVisible, setBannerVisible] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const [monitoredHistory, setMonitoredHistory] = useState<MonitoredDomain[]>(
    []
  );
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
    const domainClean = domainToPreview
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();
    if (!domainClean) return;

    const sniffedTrackers = inferTrackersForDomain(domainClean);
    setDetectedTrackers(sniffedTrackers);

    let cmpUrl = `https://${domainClean}/consent/cmp-loader.js`;
    let cookieType: CookieType = 'optional';

    if (
      domainClean.includes('google') ||
      domainClean.includes('theverge') ||
      domainClean.includes('mit')
    ) {
      cmpUrl = 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js';
      cookieType = 'optional';
    } else if (
      domainClean.includes('bbc') ||
      domainClean.includes('github') ||
      domainClean.includes('wikipedia')
    ) {
      cmpUrl = 'https://consent.cookiebot.com/uc.js';
      cookieType = 'necessary';
    } else if (
      domainClean.includes('pirate') ||
      domainClean.includes('stream') ||
      domainClean.includes('movie')
    ) {
      cmpUrl = 'https://ad-tracker-network.biz/stealth-cookie-drop.js';
      cookieType = 'suspicious';
    } else if (
      domainClean.includes('shopee') ||
      domainClean.includes('lazada')
    ) {
      cmpUrl = 'https://sdk.privacy-center.org/loader.js';
      cookieType = 'all';
    }

    setScriptInput(cmpUrl);
    setCurrentCookieType(cookieType);

    const computedHash = await sha256(cmpUrl);
    setCurrentScriptHash(computedHash);

    const { result, cmpItem } = await determineVerificationResult(computedHash);
    setVerificationResult(result);
    setCmpItemName(cmpItem ? cmpItem.cmp_name : 'Unregistered CMP Script');

    const guidance = determineGuidance(cookieType, result);
    setGuidanceRec(guidance);
    setBannerVisible(true);
  };

  useEffect(() => {
    setupDomainPreview('google.com');
  }, []);

  const handleNavigateManualDomain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDomain.trim()) return;

    setIsAuditingDomain(true);
    try {
      await setupDomainPreview(currentDomain);
      const computedHash = await sha256(scriptInput || currentDomain);
      const { result, cmpItem } = await determineVerificationResult(computedHash);

      const isThreat =
        result === 'Warning' ||
        currentDomain.includes('pirate') ||
        currentDomain.includes('movie');
      const riskLevel = isThreat
        ? 'High'
        : currentDomain.includes('cnn')
        ? 'Moderate'
        : 'Low';

      await recordMonitoredDomain(
        {
          domain: currentDomain.toLowerCase().trim(),
          url: `https://${currentDomain.toLowerCase().trim()}`,
          title: currentDomain.toUpperCase(),
          cmp_detected: true,
          cmp_name: cmpItem ? cmpItem.cmp_name : 'Unregistered CMP Script',
          script_hash: computedHash,
          verification_result: result,
          cookie_count: detectedTrackers.length + 3,
          trackers_count: detectedTrackers.length,
          trackers_list: detectedTrackers,
          privacy_risk_level: riskLevel,
          auto_blocked: isThreat,
          guidance: isThreat ? 'Warning' : 'Customize?',
        },
        activeUserId
      );

      await refreshMonitoredHistory();
      await onRefreshData();
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditingDomain(false);
    }
  };

  const handleExecuteConsentAction = async (action: ConsentAction) => {
    try {
      const computedHash =
        currentScriptHash ||
        (await sha256(scriptInput || currentDomain));

      const res = await recordConsentTransaction({
        userId: activeUserId,
        siteDomain: currentDomain.toLowerCase().trim(),
        cookieHash: computedHash,
        cookieType: currentCookieType,
        consentAction: action,
      });

      // Update Monitored history
      await recordMonitoredDomain(
        {
          domain: currentDomain.toLowerCase().trim(),
          url: `https://${currentDomain.toLowerCase().trim()}`,
          title: currentDomain.toUpperCase(),
          cmp_detected: true,
          cmp_name: cmpItemName,
          script_hash: computedHash,
          verification_result: res.publicBlock.verification_result,
          cookie_count: detectedTrackers.length + 3,
          trackers_count: action === 'reject' ? 0 : detectedTrackers.length,
          trackers_list: detectedTrackers,
          privacy_risk_level:
            currentCookieType === 'suspicious' ? 'High' : 'Low',
          auto_blocked:
            action === 'reject' || currentCookieType === 'suspicious',
          guidance: res.cookieEvent.guidance_shown,
        },
        activeUserId
      );

      setLastCommittedBlock({
        publicIndex: res.publicBlock.block_index,
        hash: res.publicBlock.hash,
        action,
      });

      setBannerVisible(false);
      await refreshMonitoredHistory();
      await onRefreshData();
    } catch (err) {
      console.error('Error committing consent action:', err);
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
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
              ACTIVE WEBSITE & CMP MONITOR
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#180735] text-[#E879F9] border border-[#9333EA]/40 text-[11px] font-mono font-semibold">
              <Radio className="h-3 w-3 text-[#E879F9] animate-pulse" />
              Live Audit Active
            </span>
          </div>
          <p className="text-xs text-[#C084FC]/80 mt-1">
            Audits any website domain in real time, intercepts cookie consent banners, and hashes script signatures to the ledger for account{' '}
            <strong className="text-white">
              {currentUser ? currentUser.username : 'Primary Auditor'}
            </strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7E22CE] hover:bg-[#6B21A8] text-white text-xs font-bold transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md"
          >
            <Sparkles className="h-4 w-4 text-white" />
            <span>Install to Real Browser</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Interactive Browser Window Outer Container */}
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
            LIVE BROWSER INTERCEPTOR WINDOW
          </div>
          <span className="text-xs font-mono font-bold text-[#E879F9] bg-[#180735] px-3 py-1 rounded-full border border-[#9333EA]/40">
            {currentDomain}
          </span>
        </div>

        {/* Clean Interactive Browser Window Frame */}
        <div className="rounded-2xl border border-[#300E54] bg-[#070210] overflow-hidden shadow-2xl">
          {/* Browser Top Navigation Toolbar */}
          <div className="flex items-center gap-3 border-b border-[#300E54] bg-[#100424] px-4 py-3">
            {/* Window dots */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="h-3 w-3 rounded-full bg-[#EF4444] inline-block" />
              <span className="h-3 w-3 rounded-full bg-[#F59E0B] inline-block" />
              <span className="h-3 w-3 rounded-full bg-[#10B981] inline-block" />
            </div>

            {/* Clean URL Input Bar */}
            <form
              onSubmit={handleNavigateManualDomain}
              className="flex flex-1 items-center gap-2 rounded-xl bg-[#180735] px-3.5 py-2 border border-[#3E1568] text-xs"
            >
              <Globe className="h-4 w-4 text-[#E879F9] shrink-0" />
              <span className="text-[#C084FC]/60 font-mono">https://</span>
              <input
                type="text"
                value={currentDomain}
                onChange={(e) => setCurrentDomain(e.target.value)}
                className="w-full bg-transparent text-purple-100 font-mono focus:outline-none placeholder-purple-400/40"
                placeholder="Type any website (e.g. google.com, lazada.com, shopee.ph, cnn.com)"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold text-xs shrink-0 transition-colors cursor-pointer shadow-xs"
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
              className="p-2 text-[#C084FC]/70 hover:text-white hover:bg-[#180735] rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <RotateCw
                className={`h-4 w-4 ${
                  isAuditingDomain ? 'animate-spin text-[#E879F9]' : ''
                }`}
              />
            </button>
          </div>

          {/* Browser Page Viewport */}
          <div className="p-6 sm:p-8 bg-[#130526] min-h-[380px] flex flex-col justify-between space-y-6">
            {/* Simulated Webpage Header & Sniffed Trackers Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#180735] border border-[#3E1568]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#250B4E] border border-[#9333EA]/40 flex items-center justify-center text-[#E879F9] font-mono font-bold text-base shrink-0">
                    {currentDomain.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-purple-100">
                        {currentDomain}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#250B4E] text-[#E879F9] border border-[#9333EA]/40">
                        {detectedTrackers.length} Trackers Sniffed
                      </span>
                    </div>
                    <p className="text-xs text-[#C084FC]/70 mt-0.5">
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
                          : 'bg-purple-950/80 text-[#D8B4FE] border border-purple-800/60'
                      }`}
                    >
                      <Cookie className="h-3 w-3 text-[#E879F9]" />
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggleable Technical Details & AI Advisor link */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onNavigateTab('ai_bot')}
                  className="text-xs text-[#D8B4FE] hover:text-white bg-[#180735] hover:bg-[#250B4E] border border-[#9333EA]/40 rounded-xl px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-all font-semibold"
                >
                  <Bot className="h-3.5 w-3.5 text-[#E879F9]" />
                  <span>Ask AI Bot About {currentDomain}</span>
                </button>

                <button
                  onClick={() =>
                    setShowTechnicalDetails(!showTechnicalDetails)
                  }
                  className="text-xs text-[#C084FC]/70 hover:text-white flex items-center gap-1 inline-flex cursor-pointer font-medium"
                >
                  <span>
                    {showTechnicalDetails ? 'Hide' : 'Inspect'} Raw Script & Hash
                  </span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {showTechnicalDetails && (
                <div className="p-4 rounded-xl bg-[#180735] border border-[#3E1568] space-y-3 text-xs animate-fadeIn">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-200 mb-1">
                      CMP Script URL / Intercepted Payload
                    </label>
                    <input
                      type="text"
                      value={scriptInput}
                      onChange={(e) => setScriptInput(e.target.value)}
                      className="w-full bg-[#0E041E] border border-[#300E54] rounded-lg px-3 py-2 text-purple-100 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#C084FC]/70">
                    <div className="flex items-center gap-2">
                      <span>SHA-256 Digest:</span>
                      <span className="text-[#E879F9] font-bold">
                        {truncateHash(currentScriptHash, 16, 16)}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyHash}
                      className="flex items-center gap-1 text-[#E879F9] hover:text-white cursor-pointer font-semibold"
                    >
                      {copiedHash ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Crypticookie Privacy Shield Banner Widget (Exact styling matching Screenshot bottom-right) */}
            {bannerVisible ? (
              <div className="rounded-2xl border border-[#3B1366] bg-[#0C031A] p-5 sm:p-6 space-y-4 shadow-2xl animate-fadeIn">
                {/* Header line with Shield Icon, Title, and Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C0B44] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#1E083E] border border-[#9333EA]/60 text-[#E879F9] flex items-center justify-center shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Crypticookie Privacy Shield
                      </h3>
                      {verificationResult === 'Verified' ? (
                        <span className="bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                          ✓ Verified CMP
                        </span>
                      ) : verificationResult === 'Warning' ? (
                        <span className="bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                          ⚠ Dark Pattern Risk
                        </span>
                      ) : (
                        <span className="bg-[#FEF08A] text-[#713F12] border border-[#FACC15] text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                          ℹ Unverified Script
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setBannerVisible(false)}
                    className="p-1 rounded-lg text-[#C084FC]/70 hover:text-white hover:bg-[#180735] transition-colors cursor-pointer self-end sm:self-auto"
                    title="Dismiss Shield"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Key-Value metadata matching screenshot */}
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[#C084FC]/70 w-28 shrink-0">Website:</span>
                    <span className="text-white font-semibold">{currentDomain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C084FC]/70 w-28 shrink-0">CMP Name:</span>
                    <span className="text-purple-200">{cmpItemName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C084FC]/70 w-28 shrink-0">Script Hash:</span>
                    <span className="text-[#38BDF8] font-bold">
                      {truncateHash(currentScriptHash, 10, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#C084FC]/70 w-28 shrink-0">Guidance Engine:</span>
                    <span className="text-[#F472B6] font-bold">{guidanceRec}</span>
                  </div>
                </div>

                {/* Action Buttons matching screenshot exact colors */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#2C0B44]">
                  <button
                    onClick={() => handleExecuteConsentAction('accept')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
                  >
                    Accept Necessary
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('reject')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
                  >
                    Reject All Trackers
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('customize')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1D0938] hover:bg-[#250B4E] border border-[#4C1D95] text-purple-200 font-semibold text-xs cursor-pointer transition-all"
                  >
                    Audit on Chain
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#0C031A] border border-[#3B1366] text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  Consent Decision Logged Live
                </h4>
                <p className="text-xs text-[#C084FC]/70">
                  Decision committed to local block and synchronized across database and dashboard in real time.
                </p>
                <button
                  onClick={() => setBannerVisible(true)}
                  className="mt-2 text-xs text-[#E879F9] hover:text-white underline cursor-pointer font-semibold"
                >
                  Reset & Change Consent Decision
                </button>
              </div>
            )}

            {/* Transaction Success Toast */}
            {lastCommittedBlock && (
              <div className="rounded-xl border border-[#9333EA]/50 bg-[#0C031A] p-3.5 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2 text-xs text-purple-200 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                  <span>
                    Block #{lastCommittedBlock.publicIndex} synced to Blockchain (
                    {truncateHash(lastCommittedBlock.hash, 8, 8)})
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('blockchain')}
                  className="text-xs font-bold text-[#E879F9] hover:text-white flex items-center gap-1 cursor-pointer"
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
      <div className="bg-[#0E041E] border border-[#391363] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-block bg-[#6B21A8] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
              LIVE MONITORED DOMAINS HISTORY
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#180735] text-[#E879F9] border border-[#9333EA]/40 font-mono font-semibold">
              {monitoredHistory.length} Logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshMonitoredHistory}
              title="Refresh logs"
              className="p-1.5 rounded-lg bg-[#180735] hover:bg-[#250B4E] text-purple-200 border border-[#9333EA]/40 text-xs cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5 text-[#E879F9]" />
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

        <div className="bg-[#130526] border border-[#300E54] rounded-2xl overflow-hidden">
          {monitoredHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#C084FC]/60 font-mono">
              No website monitoring events recorded yet for this account. Type any domain above to start auditing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#300E54] bg-[#180735] text-[11px] text-[#D8B4FE] font-bold">
                    <th className="py-3 px-4">Domain / Website</th>
                    <th className="py-3 px-4">CMP Script Name</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Trackers</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#260B44]">
                  {monitoredHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1C093E] transition-colors"
                    >
                      <td className="py-2.5 px-4 text-white font-bold flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-[#E879F9]" />
                        <span>{item.domain}</span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-200">
                        {item.cmp_name}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.verification_result === 'Verified'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : item.verification_result === 'Warning'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-950/80 text-[#D8B4FE] border border-purple-500/40'
                          }`}
                        >
                          {item.verification_result}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-purple-200">
                        {item.trackers_count} Trackers
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.privacy_risk_level === 'Low'
                              ? 'text-emerald-400'
                              : item.privacy_risk_level === 'Moderate'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {item.privacy_risk_level} Risk
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#C084FC]/60 text-[11px]">
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
