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
    { name: 'Meta Conversions API', category: 'Analytics', domain: 'connect.facebook.net', blocked: false },
  ],
  'lazada': [
    { name: 'Alibaba Analytics Tracker', category: 'Analytics', domain: 'aly.lazada.com', blocked: false },
    { name: 'Criteo Retargeting Pixel', category: 'Advertising', domain: 'criteo.com', blocked: false },
  ],
  'shopee': [
    { name: 'Shopee Tracker SDK', category: 'Analytics', domain: 'shopee.ph/api', blocked: false },
    { name: 'Adjust Attribution Engine', category: 'Fingerprinting', domain: 'adjust.com', blocked: false },
  ],
  'cnn': [
    { name: 'Prebid.js Header Bidding', category: 'Advertising', domain: 'rubiconproject.com', blocked: false },
    { name: 'Chartbeat Realtime Analytics', category: 'Analytics', domain: 'chartbeat.com', blocked: false },
    { name: 'Krux Digital DMP', category: 'Fingerprinting', domain: 'krxd.net', blocked: false },
  ]
};

const DEFAULT_TRACKERS: { name: string; category: 'Analytics' | 'Advertising' | 'Fingerprinting' | 'Essential'; domain: string; blocked: boolean }[] = [
  { name: 'Site Session Cookie (JSESSIONID)', category: 'Essential', domain: 'self', blocked: false },
  { name: 'Third-Party Analytics Beacon', category: 'Analytics', domain: 'analytics-cdn.com', blocked: false },
  { name: 'Retargeting Ad Network Pixel', category: 'Advertising', domain: 'adservice.net', blocked: false },
  { name: 'Canvas Fingerprinting Detector', category: 'Fingerprinting', domain: 'fingerprintjs.org', blocked: false },
];

export const ExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  const [currentDomain, setCurrentDomain] = useState('lazada.com');
  const [activeDomainCmp, setActiveDomainCmp] = useState({
    name: 'OneTrust Cookie Consent',
    hash: '8f94a2b109e37c8812f48931b209849201f9c8d7',
    verified: true,
  });

  const [detectedTrackers, setDetectedTrackers] = useState<DetectedTracker[]>([]);
  const [isAuditingDomain, setIsAuditingDomain] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [lastCommittedBlock, setLastCommittedBlock] = useState<{ publicIndex: number; hash: string } | null>(null);

  // Protection logs history
  const [monitoredHistory, setMonitoredHistory] = useState<MonitoredDomain[]>([]);

  // Browser Extension Modal
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Initial loads
  const refreshMonitoredHistory = async () => {
    const list = await getMonitoredDomains();
    setMonitoredHistory(list);
  };

  useEffect(() => {
    refreshMonitoredHistory();
    auditWebsiteTrackers('lazada.com');
  }, []);

  // Dynamically audit any domain entered by the user
  const auditWebsiteTrackers = (domain: string) => {
    setIsAuditingDomain(true);
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    // Find matched trackers
    let matchedTrackers = DEFAULT_TRACKERS;
    for (const key of Object.keys(KNOWN_TRACKER_SIGNATURES)) {
      if (cleanDomain.includes(key)) {
        matchedTrackers = KNOWN_TRACKER_SIGNATURES[key];
        break;
      }
    }

    // Set CMP name
    let cmpName = 'OneTrust CMP Banner';
    let isVerified = true;
    if (cleanDomain.includes('shopee') || cleanDomain.includes('cnn')) {
      cmpName = 'Didomi Consent Platform';
    } else if (cleanDomain.includes('google')) {
      cmpName = 'Google Funding Choices';
    } else if (cleanDomain.includes('facebook')) {
      cmpName = 'Custom Meta Consent Banner';
      isVerified = false;
    }

    const scriptHash = 'hash_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    setActiveDomainCmp({
      name: cmpName,
      hash: scriptHash,
      verified: isVerified,
    });

    // Create tracker list
    const trackers: DetectedTracker[] = matchedTrackers.map((t, idx) => ({
      id: `tr_${idx}_${Date.now()}`,
      name: t.name,
      category: t.category,
      domain: t.domain,
      blocked: false,
    }));

    setDetectedTrackers(trackers);
    setIsAuditingDomain(false);

    // Save to Firestore & local history DB
    recordMonitoredDomain({
      domain: cleanDomain,
      cmpName,
      verificationResult: isVerified ? 'Verified' : 'Warning',
      trackersCount: trackers.length,
      privacyRiskLevel: isVerified ? 'Low' : 'High',
    }).then(() => {
      refreshMonitoredHistory();
    });
  };

  const handleNavigateManualDomain = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDomain.trim()) return;
    auditWebsiteTrackers(currentDomain);
    setBannerVisible(true);
    setLastCommittedBlock(null);
  };

  // User acts on consent inside the extension banner
  const handleExecuteConsentAction = async (action: ConsentAction) => {
    setIsAuditingDomain(true);
    try {
      // Toggle blocked state for trackers if rejected
      if (action === 'reject') {
        setDetectedTrackers((prev) =>
          prev.map((t) => (t.category !== 'Essential' ? { ...t, blocked: true } : t))
        );
      }

      const userId = currentUser ? currentUser.id : 'u_simulator_guest';
      const cleanDomain = currentDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

      const res = await recordConsentTransaction({
        userId,
        siteDomain: cleanDomain,
        cookieHash: activeDomainCmp.hash,
        cookieType: action === 'reject' ? 'suspicious' : 'necessary',
        consentAction: action,
      });

      setLastCommittedBlock({
        publicIndex: res.publicBlock.block_index,
        hash: res.publicBlock.hash,
      });

      setBannerVisible(false);
      await onRefreshData();
      await refreshMonitoredHistory();
    } catch (err) {
      console.error('Consent action failed:', err);
    } finally {
      setIsAuditingDomain(false);
    }
  };

  const handleClearHistory = async () => {
    await clearMonitoredDomains();
    await refreshMonitoredHistory();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Extension Simulator
            </h1>
            <span className="bg-[#8b31ff] text-white font-mono text-[11px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md">
              Live Interceptor
            </span>
          </div>
          <p className="text-sm text-purple-200/80 mt-1">
            Simulate how the Crypticookie browser extension intercepts website DOM CMP banners, verifies script hashes, and records consent choices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b31ff] hover:bg-[#7c3aed] text-xs font-bold text-white shadow-lg shadow-purple-950/80 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Install to Real Browser</span>
          </button>
        </div>
      </div>

      {/* Clean Interactive Browser Window Frame */}
      <div className="rounded-[24px] border-2 border-[#8b31ff] bg-[#1a0933] shadow-2xl overflow-hidden space-y-0">
        {/* Browser Top Navigation Toolbar */}
        <div className="flex items-center gap-3 border-b border-[#7b2cbf]/50 bg-[#100422] px-5 py-3.5">
          {/* Window dots */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          {/* Clean URL Input Bar */}
          <form onSubmit={handleNavigateManualDomain} className="flex flex-1 items-center gap-2 rounded-xl bg-[#0c0318] px-4 py-2 border border-[#7b2cbf]/60 text-xs shadow-inner">
            <Globe className="h-4 w-4 text-purple-400 shrink-0" />
            <span className="text-purple-400/60 font-mono">https://</span>
            <input
              type="text"
              value={currentDomain}
              onChange={(e) => setCurrentDomain(e.target.value)}
              className="w-full bg-transparent text-white font-mono focus:outline-none placeholder-purple-300/40"
              placeholder="Type any website (e.g. google.com, lazada.com, shopee.ph, cnn.com)"
            />
            <button
              type="submit"
              className="px-3.5 py-1 rounded-lg bg-[#8b31ff] hover:bg-[#7c3aed] text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
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
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-900/40 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <RotateCw className={`h-4 w-4 ${isAuditingDomain ? 'animate-spin text-[#c084fc]' : ''}`} />
          </button>
        </div>

        {/* Browser Page Viewport */}
        <div className="p-6 sm:p-8 bg-[#0c0318] min-h-[380px] flex flex-col justify-between space-y-6">
          {/* Simulated Webpage Header & Sniffed Trackers Bar */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#100422] border border-[#7b2cbf]/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#3c096c]/70 border border-[#7b2cbf]/60 flex items-center justify-center text-[#d8b4fe] font-mono font-bold text-base shrink-0">
                  {currentDomain.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{currentDomain}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#8b31ff]/20 text-[#d8b4fe] border border-[#8b31ff]/30">
                      {detectedTrackers.length} Trackers Sniffed
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/70 mt-0.5">
                    Live DOM intercepted • SHA-256 Digest verified against registry
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  activeDomainCmp.verified
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {activeDomainCmp.verified ? 'Verified CMP Script' : 'Unrecognized Banner Script'}
                </span>
              </div>
            </div>

            {/* List of Sniffed Trackers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {detectedTrackers.map((tr) => (
                <div
                  key={tr.id}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                    tr.blocked
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300 line-through'
                      : 'bg-[#100422] border-[#7b2cbf]/40 text-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate max-w-[140px]">{tr.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      tr.category === 'Essential' ? 'bg-purple-500/20 text-[#d8b4fe]' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {tr.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-300/70 block truncate">{tr.domain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SIMULATED CRYPTICOOKIE FLOATING EXTENSION SHIELD BANNER */}
          {bannerVisible ? (
            <div className="rounded-2xl border-2 border-[#8b31ff] bg-[#1a0933] p-5 shadow-2xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#7b2cbf]/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#8b31ff] text-white flex items-center justify-center shadow-md">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <span>Crypticookie Protection Interceptor</span>
                      <span className="text-[10px] bg-[#8b31ff] text-white px-2 py-0.2 rounded-full font-normal">Active</span>
                    </h3>
                    <p className="text-[11px] text-purple-200/80">
                      Detected <strong className="text-white">{activeDomainCmp.name}</strong> on {currentDomain}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setBannerVisible(false)}
                  className="p-1 text-purple-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Dismiss Shield"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs text-purple-200/80">
                  Choose your consent preference to record this decision on the hybrid blockchain:
                </span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleExecuteConsentAction('reject')}
                    className="px-4 py-2 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    Reject Trackers
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('customize')}
                    className="px-4 py-2 rounded-full bg-[#100422] hover:bg-[#1f083d] text-purple-200 border border-[#7b2cbf]/60 text-xs font-semibold cursor-pointer transition-all"
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => handleExecuteConsentAction('accept')}
                    className="px-5 py-2 rounded-full bg-[#8b31ff] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-md shadow-purple-950/60 cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    Accept Verified
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#1a0933] border-2 border-[#8b31ff] text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Consent Decision Logged</h4>
              <p className="text-xs text-purple-200/80">
                Decision committed to local block and synchronized with Firebase Firestore.
              </p>
              <button
                onClick={() => setBannerVisible(true)}
                className="mt-2 text-xs text-purple-300 hover:text-white underline cursor-pointer"
              >
                Reset & Change Consent Decision
              </button>
            </div>
          )}

          {/* Transaction Success Toast */}
          {lastCommittedBlock && (
            <div className="rounded-xl border border-[#8b31ff]/60 bg-[#100422] p-3.5 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2 text-xs text-purple-200 font-mono">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  Block #{lastCommittedBlock.publicIndex} synced to Blockchain ({truncateHash(lastCommittedBlock.hash, 8, 8)})
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('blockchain')}
                className="text-xs font-semibold text-[#c084fc] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>View on Blockchain</span>
                <Layers className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Protectioned Domains History Table */}
      <div className="rounded-[24px] border-2 border-[#8b31ff] bg-[#1a0933] p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="inline-block bg-[#8b31ff] text-white font-mono text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md">
            ACTIVE PROTECTION DOMAINS HISTORY
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshMonitoredHistory}
              title="Refresh logs"
              className="p-1.5 rounded-lg bg-[#100422] hover:bg-[#1f083d] text-purple-300 border border-[#7b2cbf]/60 text-xs cursor-pointer"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            {monitoredHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {monitoredHistory.length === 0 ? (
          <div className="text-center py-8 text-xs text-purple-300/60 font-mono">
            No website monitoring events recorded yet. Type any domain above to start auditing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#7b2cbf]/50 text-[11px] text-purple-300/80 uppercase">
                  <th className="pb-3 font-medium">Domain / Website</th>
                  <th className="pb-3 font-medium">CMP Script Name</th>
                  <th className="pb-3 font-medium">Security Status</th>
                  <th className="pb-3 font-medium">Trackers</th>
                  <th className="pb-3 font-medium">Risk Level</th>
                  <th className="pb-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c096c]/40">
                {monitoredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#280d4a]/50 transition-colors">
                    <td className="py-3 text-white font-semibold flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-[#c084fc]" />
                      <span>{item.domain}</span>
                    </td>
                    <td className="py-3 text-purple-200/80 max-w-[160px] truncate">{item.cmp_name}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.verification_result === 'Verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.verification_result === 'Warning'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {item.verification_result}
                      </span>
                    </td>
                    <td className="py-3 text-purple-300">{item.trackers_count} trackers</td>
                    <td className="py-3">
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
                    <td className="py-3 text-purple-300/60 text-[10px]">
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
