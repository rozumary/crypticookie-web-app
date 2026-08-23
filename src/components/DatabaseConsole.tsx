import React, { useState, useEffect } from 'react';
import {
  Database,
  RotateCw,
  Trash2,
  Download,
  Server,
  Info,
} from 'lucide-react';
import { db, resetDatabaseToDefault } from '../lib/db';
import { truncateHash } from '../lib/crypto';

interface DatabaseConsoleProps {
  onRefreshData: () => void;
}

export const DatabaseConsole: React.FC<DatabaseConsoleProps> = ({ onRefreshData }) => {
  const [selectedTable, setSelectedTable] = useState<
    'cmp_registry' | 'cookie_events' | 'public_ledger' | 'private_ledger' | 'users'
  >('cmp_registry');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  const loadTableData = async () => {
    let rows: any[] = [];
    if (selectedTable === 'users') rows = await db.users.toArray();
    if (selectedTable === 'cmp_registry') rows = await db.cmp_registry.toArray();
    if (selectedTable === 'cookie_events') rows = await db.cookie_events.toArray();
    if (selectedTable === 'private_ledger') rows = await db.private_ledger.orderBy('block_index').toArray();
    if (selectedTable === 'public_ledger') rows = await db.public_ledger.orderBy('block_index').toArray();
    setTableData(rows);
  };

  useEffect(() => {
    loadTableData();
  }, [selectedTable]);

  const handleResetDatabase = async () => {
    if (confirm('Reset backend database to default initial state?')) {
      setIsResetting(true);
      try {
        await resetDatabaseToDefault();
        await loadTableData();
        await onRefreshData();
      } catch (err) {
        console.error('Reset error:', err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleExportJSON = async () => {
    const allData = {
      users: await db.users.toArray(),
      cmp_registry: await db.cmp_registry.toArray(),
      cookie_events: await db.cookie_events.toArray(),
      private_ledger: await db.private_ledger.toArray(),
      public_ledger: await db.public_ledger.toArray(),
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Backend Database Explorer</h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[11px] font-mono border border-indigo-500/20">
              Storage Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Backend persistent tables powering authentication, CMP whitelists, and blockchain ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Database</span>
          </button>
          <button
            onClick={handleResetDatabase}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Database</span>
          </button>
        </div>
      </div>

      {/* Backend Architecture Note */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex items-start gap-3 text-xs text-slate-400">
        <Server className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200 block mb-0.5">
            Backend Architecture Note
          </span>
          All data operations execute in the database storage layer and persist across sessions. You can inspect tables below to verify recorded consent transactions, user accounts, and cryptographic blocks.
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'cmp_registry', label: 'cmp_registry' },
          { id: 'cookie_events', label: 'cookie_events' },
          { id: 'public_ledger', label: 'public_ledger' },
          { id: 'private_ledger', label: 'private_ledger' },
          { id: 'users', label: 'users' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTable(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
              selectedTable === tab.id
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-300">Table: {selectedTable}</span>
          <span className="text-slate-500 font-mono">{tableData.length} records</span>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          {tableData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Table is empty.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  {Object.keys(tableData[0] || {}).map((col) => (
                    <th key={col} className="py-2.5 px-4 font-bold uppercase text-[10px]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tableData.map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-slate-800/30">
                    {Object.keys(tableData[0] || {}).map((col) => {
                      const val = row[col];
                      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
                      const isLongHash = typeof val === 'string' && val.length === 64;

                      return (
                        <td key={col} className="py-2.5 px-4 text-slate-300 max-w-xs truncate">
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
  );
};
