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

  const handleVerifyChain = async () => {
    setIsProcessing(true);
    const res = await verifyPublicChainIntegrity();
    setVerificationResult(res);
    setIsProcessing(false);
  };

  const handleExecuteTamper = async () => {
    setIsProcessing(true);
    try {
      await tamperPublicBlock({
        blockIndex: tamperTargetIndex,
        newSiteDomain: tamperedDomain,
        newConsentAction: tamperedAction,
      });
      await loadLedgers();
      await onRefreshData();
      setIsTamperingModalOpen(false);
    } catch (err) {
      console.error('Tamper execution failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepairChain = async () => {
    setIsProcessing(true);
    try {
      await repairPublicChain();
      await loadLedgers();
      await onRefreshData();
    } catch (err) {
      console.error('Chain repair failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPublicBlocks = publicBlocks.filter(
    (b) =>
      b.site_domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.prev_hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrivateBlocks = privateBlocks.filter(
    (b) =>
      b.audit_output.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Blockchain Ledger Explorer
            </h1>
            <span className="bg-[#8b31ff] text-white font-mono text-[11px] font-bold tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md">
              Proof-of-Audit
            </span>
          </div>
          <p className="text-sm text-purple-200/80 mt-1">
            Dual-chain cryptographic ledger verifying consent immutability and compliance integrity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b31ff] hover:bg-[#7c3aed] text-xs font-bold text-white shadow-lg shadow-purple-950/80 transition-all cursor-pointer"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Verify Integrity</span>
          </button>

          <button
            onClick={() => setIsTamperingModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-colors"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Simulate Tamper</span>
          </button>

          {verificationResult && !verificationResult.isValid && (
            <button
              onClick={handleRepairChain}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Repair Chain</span>
            </button>
          )}
        </div>
      </div>

      {/* Cryptographic Chain Integrity Banner */}
      {verificationResult && (
        <div className={`p-5 rounded-[24px] border-2 transition-all shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          verificationResult.isValid
            ? 'bg-[#1a0933] border-emerald-500/60'
            : 'bg-[#1a0933] border-rose-500/70'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              verificationResult.isValid
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {verificationResult.isValid ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  {verificationResult.isValid ? 'Chain Verification: PASSED' : 'Chain Verification: TAMPER DETECTED'}
                </h3>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                  verificationResult.isValid
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {publicBlocks.length} Blocks
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5 font-mono">
                {verificationResult.details}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Selector & Search Bar Card */}
      <div className="bg-[#1a0933] border-2 border-[#8b31ff] rounded-[24px] p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveLedgerTab('public')}
            className={`px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              activeLedgerTab === 'public'
                ? 'bg-[#8b31ff] text-white shadow-md'
                : 'bg-[#100422] text-purple-300/70 hover:text-white border border-[#7b2cbf]/50'
            }`}
          >
            Public Ledger ({publicBlocks.length})
          </button>
          <button
            onClick={() => setActiveLedgerTab('private')}
            className={`px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              activeLedgerTab === 'private'
                ? 'bg-[#8b31ff] text-white shadow-md'
                : 'bg-[#100422] text-purple-300/70 hover:text-white border border-[#7b2cbf]/50'
            }`}
          >
            Private Ledger ({privateBlocks.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-purple-400/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hash or domain..."
            className="w-full rounded-xl bg-[#0c0318] pl-9 pr-3 py-2 text-xs text-purple-100 border border-[#7b2cbf]/60 focus:outline-none focus:border-[#a855f7] font-mono placeholder-purple-300/40"
          />
        </div>
      </div>

      {/* Public Ledger Blocks */}
      {activeLedgerTab === 'public' && (
        <div className="space-y-4">
          {filteredPublicBlocks.length === 0 ? (
            <div className="text-center py-10 bg-[#1a0933] rounded-[24px] border-2 border-[#8b31ff] text-purple-300/60 text-xs font-mono">
              No public ledger blocks found.
            </div>
          ) : (
            filteredPublicBlocks.map((block) => {
              const isTampered =
                verificationResult &&
                !verificationResult.isValid &&
                verificationResult.corruptedBlockIndices.includes(block.block_index);

              return (
                <div
                  key={block.id}
                  className={`p-5 rounded-[24px] border-2 transition-all shadow-xl space-y-3 ${
                    isTampered
                      ? 'border-rose-500/80 bg-[#260614]'
                      : 'border-[#8b31ff] bg-[#1a0933] hover:border-[#a855f7]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-xl bg-[#8b31ff] text-white font-mono text-xs font-bold flex items-center justify-center shadow-md">
                        #{block.block_index}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {block.site_domain}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          block.verification_result === 'Verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : block.verification_result === 'Warning'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-purple-500/20 text-[#d8b4fe] border border-purple-500/30'
                        }`}
                      >
                        {block.verification_result}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-purple-200/80 uppercase text-[11px]">
                        Action: <strong className="text-white">{block.consent_action}</strong>
                      </span>
                      <span className="text-purple-300/60 text-[11px] font-mono">
                        {new Date(block.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60">
                      <div className="text-[10px] text-purple-300/70 flex items-center justify-between mb-1">
                        <span>PREV HASH</span>
                        <button
                          onClick={() => handleCopy(block.prev_hash)}
                          className="text-[#c084fc] hover:text-white"
                        >
                          {copiedHash === block.prev_hash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <span className="text-purple-300/80 block truncate">{block.prev_hash}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60">
                      <div className="text-[10px] text-purple-300/70 flex items-center justify-between mb-1">
                        <span>BLOCK HASH</span>
                        <button
                          onClick={() => handleCopy(block.hash)}
                          className="text-[#c084fc] hover:text-white"
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
            <div className="text-center py-10 bg-[#1a0933] rounded-[24px] border-2 border-[#8b31ff] text-purple-300/60 text-xs font-mono">
              No private blocks found.
            </div>
          ) : (
            filteredPrivateBlocks.map((block) => (
              <div
                key={block.id}
                className="p-5 rounded-[24px] border-2 border-[#8b31ff] bg-[#1a0933] hover:border-[#a855f7] transition-all shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-xl bg-[#8b31ff]/30 border border-[#8b31ff]/50 text-purple-200 font-mono text-xs font-bold flex items-center justify-center">
                      P#{block.block_index}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {block.audit_output}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-purple-300/80 text-[11px]">User: <strong className="text-purple-200">{block.user_id}</strong></span>
                    <span className="text-purple-300/60 text-[11px]">
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60">
                    <span className="text-[10px] text-purple-300/70 block mb-1">PREV HASH</span>
                    <span className="text-purple-300/80 block truncate">{block.prev_hash}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60">
                    <span className="text-[10px] text-purple-300/70 block mb-1">PRIVATE BLOCK HASH</span>
                    <span className="text-[#c084fc] block truncate font-bold">{block.hash}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tamper Modal */}
      {isTamperingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[24px] border-2 border-[#8b31ff] bg-[#1a0933] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#7b2cbf]/50 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-rose-400" />
                <span>Simulate Database Tampering</span>
              </h3>
              <button
                onClick={() => setIsTamperingModalOpen(false)}
                className="text-purple-300 hover:text-white"
              >
                &times;
              </button>
            </div>
            <p className="text-xs text-purple-200/80">
              Modifies a row in <code className="text-[#d8b4fe] font-mono">public_ledger</code> to demonstrate cryptographic detection.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-purple-200 mb-1 font-semibold">Target Block #</label>
                <select
                  value={tamperTargetIndex}
                  onChange={(e) => setTamperTargetIndex(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60 p-2.5 text-white font-mono focus:outline-none focus:border-[#a855f7]"
                >
                  {publicBlocks.map((b) => (
                    <option key={b.id} value={b.block_index}>
                      Block #{b.block_index} ({b.site_domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-purple-200 mb-1 font-semibold">Tampered Domain</label>
                <input
                  type="text"
                  value={tamperedDomain}
                  onChange={(e) => setTamperedDomain(e.target.value)}
                  className="w-full rounded-xl bg-[#0c0318] border border-[#7b2cbf]/60 p-2.5 text-white font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#7b2cbf]/50 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsTamperingModalOpen(false)}
                className="px-4 py-2 rounded-full bg-[#100422] hover:bg-[#1f083d] text-xs text-purple-200 border border-[#7b2cbf]/60 cursor-pointer font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTamper}
                disabled={isProcessing}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer shadow-md"
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
