import React, { useState, useEffect } from 'react';
import {
  Database,
  RotateCw,
  Trash2,
  Download,
  Server,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { db, resetDatabaseToDefault, getMonitoredDomains } from '../lib/db';
import { truncateHash } from '../lib/crypto';
import { firebaseConfigData } from '../lib/firebase';

interface DatabaseConsoleProps {
  onRefreshData: () => void;
}

export const DatabaseConsole: React.FC<DatabaseConsoleProps> = ({ onRefreshData }) => {
  const [selectedTable, setSelectedTable] = useState<
    'cmp_registry' | 'cookie_events' | 'public_ledger' | 'private_ledger' | 'monitored_domains' | 'users'
  >('cmp_registry');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadTableData = async () => {
    let rows: any[] = [];
    if (selectedTable === 'users') rows = await db.users.toArray();
    if (selectedTable === 'cmp_registry') rows = await db.cmp_registry.toArray();
    if (selectedTable === 'cookie_events') rows = await db.cookie_events.toArray();
    if (selectedTable === 'private_ledger') rows = await db.private_ledger.orderBy('block_index').toArray();
    if (selectedTable === 'public_ledger') rows = await db.public_ledger.orderBy('block_index').toArray();
    if (selectedTable === 'monitored_domains') rows = await getMonitoredDomains(100);
    setTableData(rows);
  };

  useEffect(() => {
    loadTableData();
  }, [selectedTable]);

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      await resetDatabaseToDefault();
      await loadTableData();
      await onRefreshData();
      setIsResetModalOpen(false);
      setSuccessToast('Database successfully reset to canonical genesis state!');
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportJSON = async () => {
    const allData = {
      users: await db.users.toArray(),
      cmp_registry: await db.cmp_registry.toArray(),
      cookie_events: await db.cookie_events.toArray(),
      private_ledger: await db.private_ledger.toArray(),
      public_ledger: await db.public_ledger.toArray(),
      monitored_domains: await db.monitored_domains.toArray(),
      firestoreProjectId: firebaseConfigData.projectId,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypticookie_backend_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl border border-emerald-400/40 bg-emerald-950/80 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-300 hover:text-white p-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SECTION 1: Header Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Backend Database Explorer</span>
              <span className="h-2 w-2 rounded-full bg-pink-500" />
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono font-bold border border-pink-500/30 flex items-center gap-1">
              <Cloud className="h-3 w-3 text-pink-400" />
              Firebase Firestore Active
            </span>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Cloud database and local storage keeping your consent preferences, monitored sites, and security logs saved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-purple-200 border border-pink-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-pink-300" />
            <span>Export Database</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isResetting ? 'Resetting...' : 'Reset Database'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Real Cloud Database Status Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-purple-100">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#1A0935] border border-pink-500/30 flex items-center justify-center text-pink-300 shrink-0 mt-0.5">
            <Cloud className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-white">
                Live Google Cloud Firestore Database
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#1A0935] text-pink-300 border border-pink-500/30 text-[10px] font-mono font-bold">
                Developer / Admin View
              </span>
            </div>
            <p className="text-purple-300/70 leading-relaxed">
              All consent events, registered CMP hashes, monitored domains, and blockchain blocks write directly to <strong className="text-white">Google Cloud Firestore</strong>. You can inspect tables below or view them directly in your Google Cloud / Firebase console.
            </p>
          </div>
        </div>

        <div className="bg-[#130729] border border-[#29154A] p-3.5 rounded-2xl text-[11px] font-mono shrink-0 space-y-1.5 min-w-[260px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-purple-300/70 font-bold">GCP Project:</span>
            <span className="text-white font-bold">{firebaseConfigData.projectId}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-purple-300/70 font-bold">Database ID:</span>
            <span className="text-emerald-400 font-bold truncate max-w-[160px]">{firebaseConfigData.firestoreDatabaseId || '(default)'}</span>
          </div>
          <div className="pt-1.5 border-t border-[#29154A] text-[10px] text-purple-300/50">
            Console: console.firebase.google.com
          </div>
        </div>
      </div>

      {/* SECTION 3: Table Explorer Outer Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4">
        {/* Table Selector Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'cmp_registry', label: 'cmp_registry' },
              { id: 'cookie_events', label: 'cookie_events' },
              { id: 'public_ledger', label: 'public_ledger' },
              { id: 'private_ledger', label: 'private_ledger' },
              { id: 'monitored_domains', label: 'monitored_domains' },
              { id: 'users', label: 'users' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTable(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  selectedTable === tab.id
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold'
                    : 'bg-[#130729] text-purple-200 hover:bg-[#1C0A3B] border border-[#29154A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadTableData}
            title="Reload Table Data"
            className="p-2 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-purple-200 border border-pink-500/30 transition-colors cursor-pointer shrink-0"
          >
            <RotateCw className="h-3.5 w-3.5 text-pink-300" />
          </button>
        </div>

        {/* Table Content */}
        <div className="rounded-2xl border border-[#29154A] bg-[#130729] overflow-hidden">
          <div className="p-3 bg-[#1A0935] border-b border-[#29154A] flex items-center justify-between text-xs font-bold text-white">
            <span className="font-mono">Table: {selectedTable}</span>
            <span className="font-mono text-pink-300">{tableData.length} records</span>
          </div>

          <div className="overflow-x-auto max-h-[480px]">
            {tableData.length === 0 ? (
              <div className="p-8 text-center text-xs text-purple-300/60 font-mono">
                Table is empty.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#1A0935] text-purple-200 border-b border-[#29154A] sticky top-0">
                  <tr>
                    {Object.keys(tableData[0] || {}).map((col) => (
                      <th key={col} className="py-2.5 px-4 font-bold uppercase text-[10px]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#261445] bg-[#0F061F]">
                  {tableData.map((row, i) => (
                    <tr key={row.id || i} className="hover:bg-[#1C0A3B] transition-colors">
                      {Object.keys(tableData[0] || {}).map((col) => {
                        const val = row[col];
                        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                        const isLongHash = typeof val === 'string' && val.length === 64;

                        return (
                          <td key={col} className="py-2.5 px-4 text-purple-100 max-w-xs truncate">
                            {isLongHash ? truncateHash(str, 8, 8) : str}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-[#0F061F] p-6 space-y-4 relative text-purple-100">
            <div className="flex items-center gap-3 border-b border-[#29154A] pb-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Database to Default?</h3>
                <p className="text-xs text-purple-300/70 mt-0.5">This action will reseed all tables</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="absolute right-4 top-4 text-purple-300/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-purple-100">
              <p className="font-semibold">
                Resetting the database will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-purple-300/70 pl-1 font-mono text-[11px]">
                <li>Clear custom recorded cookie events & monitored domain logs</li>
                <li>Restore canonical CMP registry whitelist/blacklist</li>
                <li>Re-initialize Genesis Block #0 for public & private ledgers</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-[#29154A] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-bold text-purple-200 border border-pink-500/30 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isResetting ? 'Resetting Tables...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
