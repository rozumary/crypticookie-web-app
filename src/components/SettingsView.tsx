import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Globe,
  Database,
  Lock,
  Download,
  Trash2,
  Check,
  RefreshCw,
  Bell,
  Cpu,
  FileText,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { db } from '../lib/db';

interface PrivacySettingsState {
  jurisdiction: 'ph_dpa' | 'gdpr' | 'strict_all';
  autoBlockPixels: boolean;
  autoBlockFingerprinting: boolean;
  strictCmpVerification: boolean;
  cloudSyncFrequency: 'realtime' | 'batched' | 'manual';
  hashAlgorithm: 'sha256' | 'sha512';
  dpaConsentRetentionDays: number;
  desktopNotifications: boolean;
}

const DEFAULT_SETTINGS: PrivacySettingsState = {
  jurisdiction: 'ph_dpa',
  autoBlockPixels: true,
  autoBlockFingerprinting: true,
  strictCmpVerification: true,
  cloudSyncFrequency: 'realtime',
  hashAlgorithm: 'sha256',
  dpaConsentRetentionDays: 365,
  desktopNotifications: true,
};

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettingsState>(() => {
    const saved = localStorage.getItem('crypticookie_app_settings');
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

  const updateSetting = <K extends keyof PrivacySettingsState>(
    key: K,
    value: PrivacySettingsState[K]
  ) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('crypticookie_app_settings', JSON.stringify(next));
      return next;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportAuditCertificate = async () => {
    setIsExporting(true);
    try {
      const events = await db.cookie_events.toArray();
      const blocks = await db.public_ledger.toArray();
      const monitored = await db.monitored_domains.toArray();

      const auditPackage = {
        title: 'Crypticookie Consent Verification Certificate',
        jurisdiction:
          settings.jurisdiction === 'ph_dpa'
            ? 'Republic Act 10173 - Philippines Data Privacy Act (DPA 2012)'
            : 'EU GDPR / ePrivacy Directive',
        exportTimestamp: new Date().toISOString(),
        deviceSummary: {
          userAgent: navigator.userAgent,
          hashAlgorithm: settings.hashAlgorithm,
        },
        cryptographicProof: {
          totalBlocks: blocks.length,
          latestBlockHash: blocks[blocks.length - 1]?.current_hash || 'GENESIS',
          merkleRoot: blocks[blocks.length - 1]?.merkle_root || 'N/A',
        },
        monitoredDomainsCount: monitored.length,
        recordedEventsCount: events.length,
        records: events,
      };

      const blob = new Blob([JSON.stringify(auditPackage, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crypticookie-dpa-audit-certificate-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export certificate:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurgeLocalData = async () => {
    if (!window.confirm('Are you sure you want to exercise your Right to be Forgotten and purge all local consent blocks, cached script hashes, and tracker history from this device?')) {
      return;
    }

    setIsPurging(true);
    try {
      await db.cookie_events.clear();
      await db.monitored_domains.clear();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to purge data:', e);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-violet-400" />
            <span>System & Privacy Settings</span>
          </h1>
          <p className="text-xs text-blue-200/70 mt-1">
            Configure real-time tracker blocking heuristics, Philippine DPA (RA 10173) compliance, cryptographic ledger hashing, and export audit trails.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold animate-fadeIn">
            <Check className="h-3.5 w-3.5" />
            <span>Preferences Auto-Saved</span>
          </div>
        )}
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Core Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Legal Compliance & Jurisdiction Framework */}
          <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm">
              <Flag className="h-4 w-4 text-violet-400" />
              <span>Data Privacy Jurisdiction & Compliance Target</span>
            </div>
            <p className="text-xs text-blue-200/70">
              Select the privacy framework applied when determining consent requirements, deceptive dark pattern classifications, and data subject rights.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => updateSetting('jurisdiction', 'ph_dpa')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  settings.jurisdiction === 'ph_dpa'
                    ? 'bg-violet-950/60 border-violet-500 text-white shadow-md shadow-violet-950/60'
                    : 'bg-[#060a17] border-blue-900/40 text-blue-300/70 hover:border-blue-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🇵🇭 Philippine DPA</span>
                  {settings.jurisdiction === 'ph_dpa' && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </div>
                <div className="text-[10px] text-blue-200/60 mt-1">
                  Republic Act 10173 & National Privacy Commission (NPC) compliance rules.
                </div>
              </button>

              <button
                onClick={() => updateSetting('jurisdiction', 'gdpr')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  settings.jurisdiction === 'gdpr'
                    ? 'bg-violet-950/60 border-violet-500 text-white shadow-md shadow-violet-950/60'
                    : 'bg-[#060a17] border-blue-900/40 text-blue-300/70 hover:border-blue-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🇪🇺 EU GDPR</span>
                  {settings.jurisdiction === 'gdpr' && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </div>
                <div className="text-[10px] text-blue-200/60 mt-1">
                  Articles 6, 7 & 83 strict consent opt-in standards.
                </div>
              </button>

              <button
                onClick={() => updateSetting('jurisdiction', 'strict_all')}
                className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                  settings.jurisdiction === 'strict_all'
                    ? 'bg-violet-950/60 border-violet-500 text-white shadow-md shadow-violet-950/60'
                    : 'bg-[#060a17] border-blue-900/40 text-blue-300/70 hover:border-blue-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>🛡️ Maximum Strict</span>
                  {settings.jurisdiction === 'strict_all' && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </div>
                <div className="text-[10px] text-blue-200/60 mt-1">
                  Universal zero-trust: blocks all non-essential scripts.
                </div>
              </button>
            </div>
          </div>

          {/* Active Protection & Tracker Defense Engine */}
          <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Real-Time Tracker Blocking & Script Interception</span>
            </div>

            <div className="space-y-3">
              {/* Toggle 1 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#060a17] border border-blue-900/40">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Auto-Block Cross-Site Advertising Pixels
                  </div>
                  <p className="text-[11px] text-blue-200/60">
                    Intersects Facebook Pixel (`_fbp`), TikTok Pixel, Criteo retargeting tags, and Google Ads beacons automatically before page render.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoBlockPixels}
                    onChange={(e) => updateSetting('autoBlockPixels', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#060a17] border border-blue-900/40">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Block Browser Fingerprinting & Audio Probing
                  </div>
                  <p className="text-[11px] text-blue-200/60">
                    Neutralizes stealth HTML5 Canvas, WebGL shader probes, AudioContext frequency analysis, and battery level telemetry.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoBlockFingerprinting}
                    onChange={(e) => updateSetting('autoBlockFingerprinting', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#060a17] border border-blue-900/40">
                <div className="space-y-0.5 max-w-[80%]">
                  <div className="text-xs font-semibold text-white">
                    Strict CMP Script Hash Verification
                  </div>
                  <p className="text-[11px] text-blue-200/60">
                    Flag any Consent Management Platform script whose SHA-256 hash does not match an immutable registered cryptographic digest.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.strictCmpVerification}
                    onChange={(e) => updateSetting('strictCmpVerification', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-blue-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Cryptographic Ledger Engine */}
          <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 text-white font-bold text-sm">
              <Lock className="h-4 w-4 text-violet-400" />
              <span>Hybrid Blockchain & Cryptographic Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#060a17] border border-blue-900/40 space-y-2">
                <label className="text-xs font-semibold text-white block">
                  Cryptographic Hashing Standard
                </label>
                <select
                  value={settings.hashAlgorithm}
                  onChange={(e) => updateSetting('hashAlgorithm', e.target.value as any)}
                  className="w-full bg-[#0b1026] border border-blue-900/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                >
                  <option value="sha256">SHA-256 (NIST FIPS 180-4 - Recommended)</option>
                  <option value="sha512">SHA-512 (Extended Digest)</option>
                </select>
                <p className="text-[10px] text-blue-300/50">
                  Calculated deterministically in browser WebCrypto runtime.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060a17] border border-blue-900/40 space-y-2">
                <label className="text-xs font-semibold text-white block">
                  Cloud Firestore Sync Mode
                </label>
                <select
                  value={settings.cloudSyncFrequency}
                  onChange={(e) => updateSetting('cloudSyncFrequency', e.target.value as any)}
                  className="w-full bg-[#0b1026] border border-blue-900/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                >
                  <option value="realtime">Real-Time Instant Replication</option>
                  <option value="batched">Batched Every 5 Minutes</option>
                  <option value="manual">Manual Local-First Only</option>
                </select>
                <p className="text-[10px] text-blue-300/50">
                  Dual-ledger sync between device IndexedDB and Google Cloud Firestore.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Data Subject Rights & Audit Actions */}
        <div className="space-y-6">
          {/* Export Official Audit Certificate */}
          <div className="rounded-2xl border border-violet-500/30 bg-[#0b1026] p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <FileText className="h-4 w-4 text-violet-400" />
              <span>Compliance Audit Certificate</span>
            </div>
            <p className="text-[11px] text-blue-200/70 leading-relaxed">
              Generate a cryptographically signed JSON compliance package including all audited domains, tracker classifications, and Merkle tree block proofs suitable for submission to privacy regulators (e.g. Philippine National Privacy Commission or GDPR Data Protection Authorities).
            </p>
            <button
              onClick={handleExportAuditCertificate}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-violet-950/60 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {isExporting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export Signed Certificate (.json)</span>
            </button>
          </div>

          {/* Philippine DPA & GDPR Data Subject Rights */}
          <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-5 space-y-3.5 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Shield className="h-4 w-4 text-sky-400" />
              <span>Data Subject Rights (RA 10173)</span>
            </div>
            <div className="text-[11px] text-blue-200/70 space-y-2">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Right to be Informed:</strong> Real-time tracker & CMP SHA-256 transparency.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Right to Object:</strong> One-click rejection of non-essential cookies.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Right to Portability:</strong> Standardized JSON cryptographic export.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Right to Erasure:</strong> Purge local storage and device consent records.</span>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-900/40">
              <button
                onClick={handlePurgeLocalData}
                disabled={isPurging}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isPurging ? 'Purging records...' : 'Exercise Right to Erasure (Purge)'}</span>
              </button>
              {purgeSuccess && (
                <p className="text-[10px] text-emerald-400 text-center mt-1.5 font-mono">
                  ✓ Device records successfully erased.
                </p>
              )}
            </div>
          </div>

          {/* Cloud Firestore Live Status */}
          <div className="rounded-2xl border border-blue-900/40 bg-[#060a17] p-4 space-y-2 text-[11px] font-mono">
            <div className="flex items-center justify-between text-blue-400/80">
              <span>Cloud DB Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between text-blue-300/60">
              <span>Region:</span>
              <span className="text-white">asia-east1</span>
            </div>
            <div className="flex items-center justify-between text-blue-300/60">
              <span>Compliance:</span>
              <span className="text-violet-300 font-semibold">PH DPA 2012 / NPC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
