import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Eye,
  Lock,
  Globe,
  BookOpen,
  Layers,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Cookie,
  Key,
} from 'lucide-react';
import { db, clearUserHistory } from '../lib/db';

interface AppSettings {
  autoBlockAds: boolean;
  blockFingerprinting: boolean;
  strictScriptHashing: boolean;
  enableNotifications: boolean;
  autoAuditNewSites: boolean;
  themeMode: 'dark' | 'midnight';
}

const DEFAULT_SETTINGS: AppSettings = {
  autoBlockAds: true,
  blockFingerprinting: true,
  strictScriptHashing: true,
  enableNotifications: true,
  autoAuditNewSites: true,
  themeMode: 'midnight',
};

interface SettingsViewProps {
  currentUser: any;
  onRefreshData: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onRefreshData,
  onNavigateTab,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('crypticookie_user_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [activeTutorialStep, setActiveTutorialStep] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('crypticookie_user_settings', JSON.stringify(next));
      return next;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const events = await db.cookie_events.toArray();
      const monitored = await db.monitored_domains.toArray();
      const blocks = await db.public_ledger.toArray();

      const exportData = {
        exportDate: new Date().toISOString(),
        monitoredDomains: monitored,
        consentEvents: events,
        blockchainBlocks: blocks,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crypticookie-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your remote and local browsing tracker history and monitored domains?')) {
      return;
    }

    setIsPurging(true);
    try {
      const activeUserId = currentUser ? currentUser.id : 'u_auditor_primary';
      await clearUserHistory(activeUserId);
      onRefreshData();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    } catch (e) {
      console.error('Purge error:', e);
    } finally {
      setIsPurging(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('crypticookie_user_settings', JSON.stringify(DEFAULT_SETTINGS));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const tutorialSteps = [
    {
      step: 1,
      title: 'Audit Websites & Detect CMPs',
      badge: 'Step 1: Website Scanner',
      icon: Globe,
      description:
        'Audit any website domain (such as shopee.ph, lazada.com.ph, gcash.com) to instantly discover what Consent Management Platform (CMP) is present, intercept raw consent banner scripts, and detect tracking cookies.',
      actionText: 'Try in Extension Simulator',
      targetTab: 'simulator',
      highlights: [
        'Real-time CMP Banner Verification (OneTrust, Cookiebot, etc.)',
        'Automatic Tracker & Marketing Pixel Classification',
        'SHA-256 Cryptographic Script Integrity Check',
      ],
    },
    {
      step: 2,
      title: 'Make Informed Consent Choices',
      badge: 'Step 2: Privacy Shield',
      icon: Shield,
      description:
        'When viewing a detected cookie banner, select your desired privacy posture (Accept All, Necessary Only, or Reject All). Crypticookie actively applies strict blocking rules to prevent cross-site advertising trackers.',
      actionText: 'Go to Simulator',
      targetTab: 'simulator',
      highlights: [
        'One-click "Necessary Only" option to shield tracking data',
        'Visual risk rating analysis (Low, Moderate, High Risk)',
        'Immediate local & cloud event synchronization',
      ],
    },
    {
      step: 3,
      title: 'Verify Immutable Blockchain Ledgers',
      badge: 'Step 3: Blockchain Explorer',
      icon: Layers,
      description:
        'Every consent transaction you record is cryptographically signed and added as a block to the immutable chain. Inspect SHA-256 block hashes, previous block linkages, and public/private ledger records.',
      actionText: 'View Blockchain Explorer',
      targetTab: 'blockchain',
      highlights: [
        'Zero-Tamper Chain Integrity: Sequential SHA-256 hashes',
        'Dual-layer: Public Ledger (domain-level) & Private Ledger (audit-level)',
        'One-click block hash copy & verification tools',
      ],
    },
    {
      step: 4,
      title: 'Browse Known CMP Registry',
      badge: 'Step 4: CMP Registry',
      icon: FileCheck,
      description:
        'Explore our verified registry of international and regional Consent Management Providers. See verified script URLs, vendor fingerprints, and risk categorizations.',
      actionText: 'Explore CMP Registry',
      targetTab: 'cmp_registry',
      highlights: [
        'Whitelisted vs. Blacklisted CMP framework definitions',
        'Script source URL checksums and known tracker lists',
        'Real-time filter and search across providers',
      ],
    },
  ];

  const faqs = [
    {
      q: 'How does Crypticookie protect my privacy?',
      a: 'Crypticookie audits websites in real-time to detect cookie consent banners and third-party trackers (like Facebook Pixel and Google Ads). It logs your choices into an immutable blockchain ledger to guarantee your consent choices are cryptographically provable and unalterable.',
    },
    {
      q: 'What is the difference between the Public and Private Ledger?',
      a: 'The Public Ledger records anonymized site domain consent events that anyone can verify for transparency. The Private Ledger records encrypted user-specific audit entries only accessible by your auditor account.',
    },
    {
      q: 'How do I test a live website right now?',
      a: 'Navigate to the "Extension Simulator" from the sidebar, enter any website domain (e.g. shopee.ph or lazada.com.ph), and click "Audit". You can then test accepting or rejecting trackers and see real-time ledger blocks created.',
    },
    {
      q: 'Is my data synced across my browser and the cloud?',
      a: 'Yes! Crypticookie uses a hybrid architecture: lightning-fast local IndexedDB storage for offline speed, plus automatic real-time cloud synchronization to Firestore for persistent access.',
    },
  ];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* SECTION 1: Header Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-pink-400" />
            <span>Settings & Tutorial Guide</span>
          </h1>
          <p className="text-xs text-purple-300/70 mt-1">
            New user quickstart instructions, cookie blocking preferences, and data controls.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-fadeIn">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Changes Saved</span>
          </div>
        )}
      </div>

      {/* SECTION 2: Interactive Tutorial & Quickstart Guide for New Users */}
      <div className="bg-[#0F061F] border border-pink-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-pink-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#261445] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Quick User Tutorial & Onboarding
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-bold font-mono">
                  Guide
                </span>
              </div>
              <p className="text-xs text-purple-300/70 mt-0.5">
                Learn how to audit websites, enforce privacy preferences, and explore blockchain consent blocks in 4 simple steps.
              </p>
            </div>
          </div>

          {/* Quick jump to Simulator button */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('simulator')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md shadow-pink-600/20"
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>Launch Simulator</span>
            </button>
          )}
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tutorialSteps.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTutorialStep === idx;
            return (
              <button
                key={item.step}
                onClick={() => setActiveTutorialStep(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#260B45] to-[#17072E] border-pink-500 text-white shadow-lg shadow-pink-900/20'
                    : 'bg-[#130729] border-[#29154A] text-purple-300/70 hover:text-purple-200 hover:bg-[#1A0935]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-pink-600 text-white' : 'bg-[#1D0938] text-purple-400'
                  }`}>
                    0{item.step}
                  </span>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-pink-400' : 'text-purple-400/60'}`} />
                </div>
                <div className="text-xs font-bold truncate text-white">
                  {item.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Content Card */}
        {(() => {
          const currentStep = tutorialSteps[activeTutorialStep];
          const CurrentIcon = currentStep.icon;
          return (
            <div className="bg-[#130729] border border-[#29154A] rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-pink-950 text-pink-300 border border-pink-500/40 text-[11px] font-bold font-mono">
                      {currentStep.badge}
                    </span>
                    <span className="text-purple-400 text-xs font-mono">Step {activeTutorialStep + 1} of {tutorialSteps.length}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CurrentIcon className="h-5 w-5 text-pink-400" />
                    <span>{currentStep.title}</span>
                  </h3>
                  <p className="text-xs text-purple-200/80 leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab(currentStep.targetTab)}
                    className="px-4 py-2.5 rounded-xl bg-[#220B40] hover:bg-pink-600 hover:text-white text-pink-300 border border-pink-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>{currentStep.actionText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Highlights Bullet Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#261445]">
                {currentStep.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-[#1A0935]/80 border border-[#2D1652]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-purple-100 font-medium">{h}</span>
                  </div>
                ))}
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={activeTutorialStep === 0}
                  onClick={() => setActiveTutorialStep((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#1A0935] text-purple-300 text-xs font-semibold hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  ← Previous Step
                </button>

                <div className="flex items-center gap-1.5">
                  {tutorialSteps.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveTutorialStep(i)}
                      className={`h-2 rounded-full cursor-pointer transition-all ${
                        activeTutorialStep === i ? 'w-6 bg-pink-500' : 'w-2 bg-[#2D1652] hover:bg-purple-500/50'
                      }`}
                    />
                  ))}
                </div>

                <button
                  disabled={activeTutorialStep === tutorialSteps.length - 1}
                  onClick={() => setActiveTutorialStep((prev) => Math.min(tutorialSteps.length - 1, prev + 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#1A0935] text-pink-300 text-xs font-semibold hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next Step →
                </button>
              </div>
            </div>
          );
        })()}

        {/* Quick FAQ / Questions Accordion */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-pink-400" />
            <span>Frequently Asked Questions for New Users</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  onClick={() => setExpandedFaq(isExpanded ? null : index)}
                  className="p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-pink-500/40 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
                    <span>{faq.q}</span>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-pink-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  {isExpanded && (
                    <p className="text-[11px] text-purple-300/80 leading-relaxed pt-1.5 border-t border-[#261445] animate-fadeIn">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3 & 4: Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Core Toggles Outer Containers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Privacy & Tracker Protection Outer Container */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Shield className="h-4 w-4 text-pink-400" />
              <span>Privacy & Tracker Protection Settings</span>
            </div>

            <div className="space-y-3">
              {/* Setting Item 1 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A]">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Auto-Block Advertising & Marketing Pixels
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Automatically prevent Facebook Pixel, Google Ads, and third-party marketing tags from tracking you across sites.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoBlockAds}
                    onChange={(e) => updateSetting('autoBlockAds', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A0935] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {/* Setting Item 2 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A]">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Block Browser Fingerprinting
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Prevent stealth tracking via canvas, audio, and device hardware probes.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.blockFingerprinting}
                    onChange={(e) => updateSetting('blockFingerprinting', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A0935] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {/* Setting Item 3 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A]">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Strict SHA-256 Script Verification
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Flag any consent banner script whose cryptographic signature has changed or is unverified.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.strictScriptHashing}
                    onChange={(e) => updateSetting('strictScriptHashing', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A0935] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* General & Notifications Outer Container */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="h-4 w-4 text-pink-400" />
              <span>General Preferences</span>
            </div>

            <div className="space-y-3">
              {/* Notification toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A]">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Show Extension Alert Badges
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Display badge count on browser toolbar when risky trackers or dark patterns are detected.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A0935] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {/* Auto audit toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A]">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Automatic Background Audit
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Inspect cookies and consent banners seamlessly upon visiting new websites.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoAuditNewSites}
                    onChange={(e) => updateSetting('autoAuditNewSites', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A0935] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Data & Storage Actions Outer Containers */}
        <div className="space-y-6">
          {/* Export Data Outer Container */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-3.5">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Download className="h-4 w-4 text-pink-400" />
              <span>Export Audit Data</span>
            </div>
            <p className="text-[11px] text-purple-300/70">
              Download your monitored domains, tracker classifications, and blockchain consent blocks in JSON format.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-pink-900/20"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export Data (.json)</span>
            </button>
          </div>

          {/* Clear Browsing Data Outer Container */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-3.5">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>Clear Stored Data</span>
            </div>
            <p className="text-[11px] text-purple-300/70">
              Wipe all recorded domains, tracker event logs, and local browser cache from this device.
            </p>
            <button
              onClick={handleClearHistory}
              disabled={isPurging}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPurging ? 'Clearing...' : 'Clear History & Logs'}</span>
            </button>
            {purgeSuccess && (
              <p className="text-[10px] text-emerald-400 text-center font-mono font-bold">
                ✓ History cleared successfully.
              </p>
            )}
          </div>

          {/* Reset Settings Outer Container */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-5 text-center">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-pink-300 hover:text-white font-bold underline cursor-pointer transition-colors"
            >
              Reset Settings to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
