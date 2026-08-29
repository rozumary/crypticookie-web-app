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
    <div className="space-y-6 pb-12">
      {/* Success Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Backend Database Explorer</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-mono border border-emerald-500/20 flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              Firebase Firestore Active
            </span>
          </div>
          <p className="text-sm text-fuchsia-200/70 mt-1">
            Real cloud database and local Dexie persistence powering CMP whitelists, consent events, monitored websites, and blockchain ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0a0510] hover:bg-blue-950/60 text-fuchsia-200 border border-fuchsia-900/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Database</span>
          </button>
          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isResetting ? 'Resetting...' : 'Reset Database'}</span>
          </button>
        </div>
      </div>

      {/* Real Cloud Database Status Card */}
      <div className="rounded-2xl border border-fuchsia-900/40 bg-[#0a0510]/90 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-fuchsia-200/80 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-white">
                Live Google Cloud Firestore Database
              </span>
              <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-mono">
                Developer / Admin View
              </span>
            </div>
            <p className="text-fuchsia-300/70">
              All consent events, registered CMP hashes, monitored domains, and blockchain blocks write directly to <strong>Google Cloud Firestore</strong>. You can inspect tables below or view them directly in your Google Cloud / Firebase console.
            </p>
          </div>
        </div>

        <div className="bg-[#06020a] border border-fuchsia-900/50 p-3 rounded-xl text-[11px] font-mono shrink-0 space-y-1.5 min-w-[260px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-fuchsia-400/70">GCP Project:</span>
            <span className="text-white font-semibold">{firebaseConfigData.projectId}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-fuchsia-400/70">Database ID:</span>
            <span className="text-emerald-400 font-semibold truncate max-w-[160px]">{firebaseConfigData.firestoreDatabaseId || '(default)'}</span>
          </div>
          <div className="pt-1.5 border-t border-fuchsia-900/40 text-[10px] text-fuchsia-300/50">
            Console: console.firebase.google.com
          </div>
        </div>
      </div>

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
                  ? 'bg-fuchsia-600 text-white font-semibold shadow-sm'
                  : 'bg-[#0a0510] text-fuchsia-300/70 hover:text-white border border-fuchsia-900/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={loadTableData}
          title="Reload Table Data"
          className="p-2 rounded-xl bg-[#0a0510] hover:bg-blue-950/60 text-fuchsia-300 border border-fuchsia-900/40 transition-colors cursor-pointer shrink-0"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table Content */}
      <div className="rounded-2xl border border-fuchsia-900/40 bg-[#0a0510]/90 overflow-hidden shadow-sm">
        <div className="p-3 bg-[#06020a] border-b border-fuchsia-900/40 flex items-center justify-between text-xs">
          <span className="font-mono text-fuchsia-200">Table: {selectedTable}</span>
          <span className="text-fuchsia-300/60 font-mono">{tableData.length} records</span>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          {tableData.length === 0 ? (
            <div className="p-8 text-center text-xs text-fuchsia-300/50 font-mono">
              Table is empty.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#06020a] text-fuchsia-300/70 border-b border-fuchsia-900/40 sticky top-0">
                <tr>
                  {Object.keys(tableData[0] || {}).map((col) => (
                    <th key={col} className="py-2.5 px-4 font-bold uppercase text-[10px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-fuchsia-900/30">
                {tableData.map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-fuchsia-950/20">
                    {Object.keys(tableData[0] || {}).map((col) => {
                      const val = row[col];
                      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                      const isLongHash = typeof val === 'string' && val.length === 64;

                      return (
                        <td key={col} className="py-2.5 px-4 text-fuchsia-100 max-w-xs truncate">
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

      {/* Confirmation Modal for Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0a0510] p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3 border-b border-fuchsia-900/40 pb-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Database to Default?</h3>
                <p className="text-xs text-fuchsia-200/70 mt-0.5">This action will reseed all tables</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="absolute right-4 top-4 text-fuchsia-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-fuchsia-100">
              <p>
                Resetting the database will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-fuchsia-200/80 pl-1 font-mono text-[11px]">
                <li>Clear custom recorded cookie events & monitored domain logs</li>
                <li>Restore canonical CMP registry whitelist/blacklist</li>
                <li>Re-initialize Genesis Block #0 for public & private ledgers</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-fuchsia-900/40 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-blue-950/60 hover:bg-fuchsia-900/60 text-xs text-fuchsia-200 border border-blue-800/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-950/60 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
