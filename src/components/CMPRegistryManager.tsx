import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  Trash2,
  Copy,
  Check,
  Cloud,
} from 'lucide-react';
import { type CMPRegistryItem, type CMPStatus } from '../types/database';
import { db, syncToFirestore, deleteFromFirestore } from '../lib/db';
import { sha256, truncateHash } from '../lib/crypto';

interface CMPRegistryManagerProps {
  onRefreshData: () => void;
}

export const CMPRegistryManager: React.FC<CMPRegistryManagerProps> = ({ onRefreshData }) => {
  const [items, setItems] = useState<CMPRegistryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCmpName, setNewCmpName] = useState('');
  const [newScriptInput, setNewScriptInput] = useState('');
  const [newScriptHash, setNewScriptHash] = useState('');
  const [newStatus, setNewStatus] = useState<CMPStatus>('whitelist');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadItems = async () => {
    const list = await db.cmp_registry.toArray();
    setItems(list);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleComputeHash = async (val: string) => {
    setNewScriptInput(val);
    if (!val.trim()) {
      setNewScriptHash('');
      return;
    }
    const computed = await sha256(val.trim());
    setNewScriptHash(computed);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCmpName.trim() || !newScriptHash.trim()) return;

    try {
      const newItem: CMPRegistryItem = {
        id: 'cmp_' + Math.random().toString(36).substring(2, 10),
        cmp_name: newCmpName.trim(),
        script_hash: newScriptHash.trim().toLowerCase(),
        status: newStatus,
        submitted_by: 'Security Auditor',
        created_at: new Date().toISOString(),
      };

      await db.cmp_registry.add(newItem);
      await syncToFirestore('cmp_registry', newItem.id, newItem);
      await loadItems();
      await onRefreshData();

      setIsAddModalOpen(false);
      setNewCmpName('');
      setNewScriptInput('');
      setNewScriptHash('');
    } catch (err) {
      console.error('Error adding CMP script:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: CMPStatus) => {
    await db.cmp_registry.update(id, { status });
    const updatedItem = await db.cmp_registry.get(id);
    if (updatedItem) {
      await syncToFirestore('cmp_registry', id, updatedItem);
    }
    await loadItems();
    await onRefreshData();
  };

  const handleDeleteItem = async (id: string) => {
    await db.cmp_registry.delete(id);
    await deleteFromFirestore('cmp_registry', id);
    await loadItems();
    await onRefreshData();
  };

  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    const matchesSearch =
      item.cmp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.script_hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Outer Container */}
      <div className="bg-[#160E2A] border border-[#2E1C50] rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">CMP Script Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#251545] text-purple-300 text-[10px] font-mono font-bold border border-[#4C2888] flex items-center gap-1">
              <Cloud className="h-3 w-3 text-purple-300" />
              Firestore Cloud Synced
            </span>
          </div>
          <p className="text-xs text-purple-300/70 mt-1">
            Database of verified Consent Management Platform SHA-256 script hashes.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-900/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add CMP Script</span>
        </button>
      </div>

      {/* SECTION 2: Main Registry Outer Container */}
      <div className="bg-[#160E2A] border border-[#2E1C50] rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/40 space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#341F5C] pb-4">
          <div className="flex items-center gap-2">
            {['all', 'whitelist', 'blacklist'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  activeFilter === tab
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[#251545] text-purple-200 hover:bg-[#2F1B56] border border-[#4C2888]'
                }`}
              >
                {tab === 'all' ? `All (${items.length})` : tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-purple-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CMP name or hash..."
              className="w-full rounded-xl bg-[#120B22] pl-9 pr-3 py-1.5 text-xs text-purple-100 border border-[#35205F] focus:outline-none focus:border-purple-500 font-mono placeholder-purple-400/40"
            />
          </div>
        </div>

        {/* Registry Table Container */}
        <div className="bg-[#180F2F] border border-[#321E59] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#21143D] text-purple-200 border-b border-[#321E59] text-[11px] font-bold">
                <tr>
                  <th className="py-3.5 px-4">CMP Name</th>
                  <th className="py-3.5 px-4">SHA-256 Script Hash</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B1B4B]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-purple-300/60 text-xs">
                      No CMP registry items match your query.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#251645] transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{item.cmp_name}</td>
                      <td className="py-3 px-4 font-mono text-purple-300/70">
                        <div className="flex items-center gap-2">
                          <span title={item.script_hash}>{truncateHash(item.script_hash, 8, 8)}</span>
                          <button
                            onClick={() => handleCopy(item.script_hash)}
                            className="text-purple-300 hover:text-white"
                          >
                            {copiedHash === item.script_hash ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateStatus(item.id, e.target.value as CMPStatus)}
                          className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            item.status === 'whitelist'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-950/70 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <option value="whitelist">whitelist</option>
                          <option value="blacklist">blacklist</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-purple-300/70 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete CMP"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090514]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#4C2888] bg-[#160E2A] p-6 shadow-2xl space-y-4 text-purple-100">
            <div className="flex items-center justify-between border-b border-[#341F5C] pb-3">
              <h3 className="text-base font-bold text-white">Add CMP Script Hash</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-purple-300/70 hover:text-white text-lg font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-purple-200 font-semibold mb-1">CMP / Framework Name</label>
                <input
                  type="text"
                  value={newCmpName}
                  onChange={(e) => setNewCmpName(e.target.value)}
                  placeholder="e.g. Cookiebot v4.2"
                  required
                  className="w-full rounded-xl bg-[#120B22] border border-[#35205F] p-2.5 text-purple-100 focus:outline-none focus:border-purple-500 placeholder-purple-400/40"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">Script URL or Raw JS (Hashed)</label>
                <input
                  type="text"
                  value={newScriptInput}
                  onChange={(e) => handleComputeHash(e.target.value)}
                  placeholder="Paste script content or URL to hash"
                  className="w-full rounded-xl bg-[#120B22] border border-[#35205F] p-2.5 text-purple-100 focus:outline-none focus:border-purple-500 font-mono placeholder-purple-400/40"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">SHA-256 Hash</label>
                <input
                  type="text"
                  value={newScriptHash}
                  onChange={(e) => setNewScriptHash(e.target.value)}
                  placeholder="64-character hex hash"
                  required
                  className="w-full rounded-xl bg-[#120B22] border border-[#35205F] p-2.5 text-purple-100 focus:outline-none focus:border-purple-500 font-mono text-[11px] placeholder-purple-400/40"
                />
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">Registry Classification</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CMPStatus)}
                  className="w-full rounded-xl bg-[#120B22] border border-[#35205F] p-2.5 text-purple-100 focus:outline-none focus:border-purple-500 cursor-pointer font-semibold"
                >
                  <option value="whitelist">Whitelist (Trusted)</option>
                  <option value="blacklist">Blacklist (Deceptive / Threat)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#341F5C] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#251545] hover:bg-[#2F1B56] text-purple-200 border border-[#4C2888] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Add to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
