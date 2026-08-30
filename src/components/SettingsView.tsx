import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Bell,
  Eye,
  Lock,
  Database,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { db, clearUserHistory } from '../lib/db';
import { CrypticookieLogo } from './CrypticookieLogo';

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
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onRefreshData,
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
        user: currentUser ? currentUser.username : 'Primary Auditor',
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
    if (
      !window.confirm(
        'Are you sure you want to clear your remote and local browsing tracker history and monitored domains?'
      )
    ) {
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

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <SettingsIcon className="h-6 w-6 text-pink-400" />
              <span>Application Settings</span>
            </h1>
            <p className="text-xs text-purple-300/70 mt-1">
              Configure cookie blocking policies, tracker detection rules, and data export options.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-fadeIn">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Changes Saved</span>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Core Protection & Extension Toggles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Privacy & Tracker Protection Card */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg shadow-purple-950/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#261445] pb-3.5">
              <Shield className="h-4 w-4 text-pink-400" />
              <span>Privacy & Tracker Protection</span>
            </div>

            <div className="space-y-3.5">
              {/* Setting Item 1 */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-[#3B1E6B] transition-colors">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Auto-Block Advertising & Marketing Pixels
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Automatically prevent Facebook Pixel, Google Ads, and third-party marketing tags from tracking you across sites.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-[#3B1E6B] transition-colors">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Block Browser Fingerprinting
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Prevent stealth tracking via canvas, WebGL, audio, and device hardware probes.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-[#3B1E6B] transition-colors">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white">
                    Strict SHA-256 Script Verification
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Flag any consent banner script whose cryptographic signature has changed or is unverified.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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

          {/* General & Background Audit Preferences Card */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-7 space-y-5 shadow-lg shadow-purple-950/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#261445] pb-3.5">
              <Sliders className="h-4 w-4 text-pink-400" />
              <span>General & Background Auditing</span>
            </div>

            <div className="space-y-3.5">
              {/* Notification toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-[#3B1E6B] transition-colors">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-purple-400" />
                    <span>Show Extension Alert Badges</span>
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Display badge count on browser toolbar when risky trackers or dark patterns are detected.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#130729] border border-[#29154A] hover:border-[#3B1E6B] transition-colors">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-purple-400" />
                    <span>Automatic Background Audit</span>
                  </div>
                  <p className="text-[11px] text-purple-300/70">
                    Inspect cookies and consent banners seamlessly upon visiting new websites.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
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

        {/* Right 1 Column: Data & Storage Actions */}
        <div className="space-y-6">
          {/* Export Data Card */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-4 shadow-lg shadow-purple-950/10">
            <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-[#261445] pb-3">
              <Download className="h-4 w-4 text-pink-400" />
              <span>Export Audit Data</span>
            </div>
            <p className="text-[11px] text-purple-300/70 leading-relaxed">
              Download all recorded domains, tracker event classifications, and blockchain consent blocks in JSON format.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-pink-900/20 active:scale-95"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export Data (.json)</span>
            </button>
          </div>

          {/* Clear Browsing Data Card */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 space-y-4 shadow-lg shadow-purple-950/10">
            <div className="flex items-center gap-2 text-white font-bold text-xs border-b border-[#261445] pb-3">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>Clear Stored Data</span>
            </div>
            <p className="text-[11px] text-purple-300/70 leading-relaxed">
              Wipe all recorded domains, tracker event logs, and local browser cache from this device.
            </p>
            <button
              onClick={handleClearHistory}
              disabled={isPurging}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 font-bold text-xs transition-colors cursor-pointer active:scale-95"
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

          {/* Reset Settings Card */}
          <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-5 text-center">
            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-pink-300 hover:text-white font-semibold cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Settings to Defaults</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
