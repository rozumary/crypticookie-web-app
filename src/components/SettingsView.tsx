import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Trash2,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Eye,
  Lock,
  Globe,
} from 'lucide-react';
import { db } from '../lib/db';

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

export const SettingsView: React.FC = () => {
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
    if (!window.confirm('Are you sure you want to clear your local browsing tracker history and monitored domains?')) {
      return;
    }

    setIsPurging(true);
    try {
      await db.monitored_domains.clear();
      await db.cookie_events.clear();
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
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-purple-400" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-purple-200/70 mt-1">
            Manage your cookie blocking preferences, extension alerts, and stored data.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold animate-fadeIn">
            <Check className="h-3.5 w-3.5" />
            <span>Changes Saved</span>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Core Toggles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Privacy & Tracker Protection */}
          <div className="rounded-2xl border border-purple-600/50 bg-[#180a2b] p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Shield className="h-4 w-4 text-purple-400" />
              <span>Privacy & Tracker Protection</span>
            </div>

            <div className="space-y-3">
              {/* Setting Item 1 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f051c] border border-purple-600/50">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Auto-Block Advertising & Marketing Pixels
                  </div>
                  <p className="text-[11px] text-purple-200/60">
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
                  <div className="w-11 h-6 bg-purple-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Setting Item 2 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f051c] border border-purple-600/50">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Block Browser Fingerprinting
                  </div>
                  <p className="text-[11px] text-purple-200/60">
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
                  <div className="w-11 h-6 bg-purple-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Setting Item 3 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f051c] border border-purple-600/50">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Strict SHA-256 Script Verification
                  </div>
                  <p className="text-[11px] text-purple-200/60">
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
                  <div className="w-11 h-6 bg-purple-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* General & Notifications */}
          <div className="rounded-2xl border border-purple-600/50 bg-[#180a2b] p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="h-4 w-4 text-sky-400" />
              <span>General Preferences</span>
            </div>

            <div className="space-y-3">
              {/* Notification toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f051c] border border-purple-600/50">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Show Extension Alert Badges
                  </div>
                  <p className="text-[11px] text-purple-200/60">
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
                  <div className="w-11 h-6 bg-purple-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Auto audit toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0f051c] border border-purple-600/50">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Automatic Background Audit
                  </div>
                  <p className="text-[11px] text-purple-200/60">
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
                  <div className="w-11 h-6 bg-purple-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Data & Storage Actions */}
        <div className="space-y-6">
          {/* Export Data */}
          <div className="rounded-2xl border border-purple-600/50 bg-[#180a2b] p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Download className="h-4 w-4 text-purple-400" />
              <span>Export Audit Data</span>
            </div>
            <p className="text-[11px] text-purple-200/70">
              Download your monitored domains, tracker classifications, and blockchain consent blocks in JSON format.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-purple-950/60"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export Data (.json)</span>
            </button>
          </div>

          {/* Clear Browsing Data */}
          <div className="rounded-2xl border border-purple-600/50 bg-[#180a2b] p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>Clear Stored Data</span>
            </div>
            <p className="text-[11px] text-purple-200/70">
              Wipe all recorded domains, tracker event logs, and local browser cache from this device.
            </p>
            <button
              onClick={handleClearHistory}
              disabled={isPurging}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isPurging ? 'Clearing...' : 'Clear History & Logs'}</span>
            </button>
            {purgeSuccess && (
              <p className="text-[10px] text-emerald-400 text-center font-mono">
                ✓ History cleared successfully.
              </p>
            )}
          </div>

          {/* Reset Settings */}
          <div className="rounded-2xl border border-purple-600/50 bg-[#180a2b] p-4 text-center">
            <button
              onClick={handleResetDefaults}
              className="text-xs text-purple-400/80 hover:text-purple-200 underline cursor-pointer transition-colors"
            >
              Reset Settings to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
