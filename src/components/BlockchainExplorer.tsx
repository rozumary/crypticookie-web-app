import React, { useState, useEffect } from 'react';
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  RotateCw,
  Copy,
  Check,
  Search,
  Wrench,
  Flame,
} from 'lucide-react';
import {
  type PublicLedgerBlock,
  type PrivateLedgerBlock,
  type ChainVerificationResult,
} from '../types/database';
import {
  db,
  verifyPublicChainIntegrity,
  tamperPublicBlock,
  repairPublicChain,
} from '../lib/db';
import { truncateHash } from '../lib/crypto';

interface BlockchainExplorerProps {
  onRefreshData: () => void;
}

export const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({ onRefreshData }) => {
  const [activeLedgerTab, setActiveLedgerTab] = useState<'public' | 'private'>('public');
  const [publicBlocks, setPublicBlocks] = useState<PublicLedgerBlock[]>([]);
  const [privateBlocks, setPrivateBlocks] = useState<PrivateLedgerBlock[]>([]);
  const [verificationResult, setVerificationResult] = useState<ChainVerificationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Tampering Simulator State
  const [isTamperingModalOpen, setIsTamperingModalOpen] = useState(false);
  const [tamperTargetIndex, setTamperTargetIndex] = useState<number>(1);
  const [tamperedDomain, setTamperedDomain] = useState('altered-domain.com');
  const [tamperedAction, setTamperedAction] = useState<'accept' | 'reject' | 'customize'>('accept');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadLedgers = async () => {
    const pub = await db.public_ledger.orderBy('block_index').toArray();
    const priv = await db.private_ledger.orderBy('block_index').toArray();
    setPublicBlocks(pub);
    setPrivateBlocks(priv);
    const integrity = await verifyPublicChainIntegrity();
    setVerificationResult(integrity);
  };

  useEffect(() => {
    loadLedgers();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExecuteTamper = async () => {
    setIsProcessing(true);
    try {
      await tamperPublicBlock(tamperTargetIndex, tamperedDomain, tamperedAction);
      await loadLedgers();
      await onRefreshData();
      setIsTamperingModalOpen(false);
    } catch (err) {
      console.error('Tamper simulation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepairChain = async () => {
    setIsProcessing(true);
    try {
      await repairPublicChain(0);
      await loadLedgers();
      await onRefreshData();
    } catch (err) {
      console.error('Repair chain error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPublicBlocks = publicBlocks.filter(
    (b) =>
      b.site_domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cookie_hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrivateBlocks = privateBlocks.filter(
    (b) =>
      b.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.audit_output.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Top Header Outer Container */}
      <div className="bg-gradient-to-r from-[#2e124f]/90 via-[#250d42]/90 to-[#2e124f]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl shadow-purple-950/20 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Blockchain Explorer</span>
              <span className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#371661] text-pink-300 border border-purple-400/40 text-[11px] font-mono font-semibold">
              Hybrid PB+P Chain
            </span>
          </div>
          <p className="text-xs text-purple-200/80 mt-1">
            Secure verification history: Public records for transparency + Private records for user privacy choices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTamperingModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 text-xs font-bold transition-colors cursor-pointer shadow-sm"
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>Tamper Test</span>
          </button>

          <button
            onClick={loadLedgers}
            title="Refresh Integrity"
            className="p-2 rounded-xl bg-[#371661] hover:bg-[#471c7d] text-purple-200 border border-purple-400/40 transition-colors cursor-pointer shadow-sm"
          >
            <RotateCw className="h-4 w-4 text-pink-300" />
          </button>
        </div>
      </div>

      {/* SECTION 2: Integrity Status Outer Container */}
      {verificationResult && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-purple-950/20 backdrop-blur-md ${
            verificationResult.isValid
              ? 'border-purple-400/30 bg-gradient-to-r from-[#2c114a]/90 to-[#220c3d]/90 text-purple-100'
              : 'border-rose-700/80 bg-gradient-to-r from-rose-950/80 to-[#220c3d]/90 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.isValid ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">
                  {verificationResult.isValid
                    ? 'Chain Integrity: 100% Valid'
                    : `Tampered Block Detected at Index #${verificationResult.brokenBlockIndex}`}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#371661] text-pink-300 border border-purple-400/40 font-bold">
                  {verificationResult.totalBlocks} Blocks
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                {verificationResult.isValid
                  ? 'All sequential cryptographic SHA-256 block hashes are intact.'
                  : 'A block has been modified out-of-band. Cryptographic proof mismatch.'}
              </p>
            </div>
          </div>

          {!verificationResult.isValid && (
            <button
              onClick={handleRepairChain}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shrink-0 shadow-md"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Repair Chain</span>
            </button>
          )}
        </div>
      )}

      {/* SECTION 3: Main Explorer Outer Container */}
      <div className="bg-gradient-to-b from-[#2a104a]/90 to-[#200b3b]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-purple-950/20 backdrop-blur-md">
        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-400/30 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLedgerTab('public')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                activeLedgerTab === 'public'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'bg-[#371661] text-purple-200 hover:bg-[#471c7d] border border-purple-400/40'
              }`}
            >
              <Unlock className="h-3.5 w-3.5 text-pink-300" />
              <span>Public Ledger ({publicBlocks.length})</span>
            </button>

            <button
              onClick={() => setActiveLedgerTab('private')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                activeLedgerTab === 'private'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'bg-[#371661] text-purple-200 hover:bg-[#471c7d] border border-purple-400/40'
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-pink-300" />
              <span>Private Ledger ({privateBlocks.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-pink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search domain or hash..."
              className="w-full rounded-xl bg-[#1e0a36] pl-9 pr-3 py-1.5 text-xs text-purple-100 border border-purple-400/35 focus:outline-none focus:border-pink-500 focus:bg-[#250d42] font-mono placeholder-purple-300/40"
            />
          </div>
        </div>

        {/* Public Ledger Blocks */}
        {activeLedgerTab === 'public' && (
          <div className="space-y-4">
            {filteredPublicBlocks.length === 0 ? (
              <div className="text-center py-10 bg-[#1e0a36] rounded-2xl border border-purple-400/30 text-purple-300/70 text-xs font-mono">
                No public blocks found.
              </div>
            ) : (
              filteredPublicBlocks.map((block) => {
                const isTampered =
                  verificationResult &&
                  !verificationResult.isValid &&
                  verificationResult.brokenBlockIndex === block.block_index;

                return (
                  <div
                    key={block.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isTampered
                        ? 'border-rose-700/80 bg-rose-950/60 shadow-lg'
                        : 'border-purple-400/30 bg-[#1e0a36] hover:border-pink-500/50 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-[#371661] border border-purple-400/40 text-pink-300 font-mono text-xs font-bold flex items-center justify-center">
                          #{block.block_index}
                        </span>
                        <span className="font-bold text-white text-sm">
                          {block.block_index === 0 ? 'Genesis Block' : block.site_domain}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                            block.verification_result === 'Verified'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : block.verification_result === 'Warning'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-950/80 text-purple-200 border border-purple-400/40'
                          }`}
                        >
                          {block.verification_result}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-purple-200/80 uppercase text-[11px]">
                          Action: <strong className="text-pink-300 font-bold">{block.consent_action}</strong>
                        </span>
                        <span className="text-purple-300/70 text-[11px] font-mono">
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-[#2a104a]/80 border border-purple-400/25">
                        <div className="text-[10px] text-purple-200/80 flex items-center justify-between mb-1 font-semibold">
                          <span>PREV HASH</span>
                          <button
                            onClick={() => handleCopy(block.prev_hash)}
                            className="text-pink-300 hover:text-white cursor-pointer"
                          >
                            {copiedHash === block.prev_hash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <span className="text-purple-200/80 block truncate">{block.prev_hash}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#2a104a]/80 border border-purple-400/25">
                        <div className="text-[10px] text-purple-200/80 flex items-center justify-between mb-1 font-semibold">
                          <span>BLOCK HASH</span>
                          <button
                            onClick={() => handleCopy(block.hash)}
                            className="text-pink-300 hover:text-white cursor-pointer"
                          >
                            {copiedHash === block.hash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <span className={`block truncate ${isTampered ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}`}>
                          {block.hash}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Private Ledger Blocks */}
        {activeLedgerTab === 'private' && (
          <div className="space-y-4">
            {filteredPrivateBlocks.length === 0 ? (
              <div className="text-center py-10 bg-[#1e0a36] rounded-2xl border border-purple-400/30 text-purple-300/70 text-xs font-mono">
                No private blocks found.
              </div>
            ) : (
              filteredPrivateBlocks.map((block) => (
                <div
                  key={block.id}
                  className="p-5 rounded-2xl border border-purple-400/30 bg-[#1e0a36] hover:border-pink-500/50 transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-7 w-7 rounded-lg bg-[#371661] border border-purple-400/40 text-pink-300 font-mono text-xs font-bold flex items-center justify-center">
                        P#{block.block_index}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {block.audit_output}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-purple-200/80 text-[11px]">User: <strong className="text-pink-300 font-bold">{block.user_id}</strong></span>
                      <span className="text-purple-300/70 text-[11px]">
                        {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#2a104a]/80 border border-purple-400/25">
                      <span className="text-[10px] text-purple-200/80 block mb-1 font-semibold">PREV HASH</span>
                      <span className="text-purple-200/80 block truncate">{block.prev_hash}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#2a104a]/80 border border-purple-400/25">
                      <span className="text-[10px] text-purple-200/80 block mb-1 font-semibold">PRIVATE BLOCK HASH</span>
                      <span className="text-pink-300 block truncate font-bold">{block.hash}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tamper Modal */}
      {isTamperingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-purple-400/40 bg-gradient-to-b from-[#2e124f] to-[#1e0a36] p-6 space-y-4 text-purple-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-purple-400/30 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-500" />
                <span>Simulate Database Tampering</span>
              </h3>
              <button
                onClick={() => setIsTamperingModalOpen(false)}
                className="text-purple-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-purple-200/80">
              Modifies a row in <code className="text-pink-300 font-mono font-bold">public_ledger</code> to demonstrate cryptographic detection.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-purple-200 font-semibold mb-1">Target Block #</label>
                <select
                  value={tamperTargetIndex}
                  onChange={(e) => setTamperTargetIndex(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#1e0a36] border border-purple-400/35 p-2.5 text-purple-100 font-mono focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  {publicBlocks.map((b) => (
                    <option key={b.id} value={b.block_index} className="bg-[#240d42]">
                      Block #{b.block_index} ({b.site_domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-purple-200 font-semibold mb-1">Tampered Domain</label>
                <input
                  type="text"
                  value={tamperedDomain}
                  onChange={(e) => setTamperedDomain(e.target.value)}
                  className="w-full rounded-xl bg-[#1e0a36] border border-purple-400/35 p-2.5 text-purple-100 font-mono focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-purple-400/30 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsTamperingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#371661] hover:bg-[#471c7d] text-xs text-purple-200 font-semibold border border-purple-400/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTamper}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer shadow-md"
              >
                Tamper Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
