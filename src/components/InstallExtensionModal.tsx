import React, { useState } from 'react';
import {
  Download,
  Check,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Shield,
  Layers,
  FolderArchive,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Radio,
} from 'lucide-react';
import { downloadExtensionZip } from '../lib/extensionBuilder';

interface InstallExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallExtensionModal: React.FC<InstallExtensionModalProps> = ({ isOpen, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadExtensionZip();
      setDownloadSuccess(true);
      setActiveStep(2);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to download extension zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B235C]/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl border border-[#B78AE8] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10 border-b border-[#CBA3F5] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#EDE1FF] border border-[#B78AE8] shadow-sm shrink-0 flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#8B4ED8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#3B235C] tracking-tight">
                  Install Crypticookie to Real Browser
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDE1FF] text-[#8B4ED8] border border-[#B78AE8] text-[10px] font-mono font-bold">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-[#6B528E] mt-0.5">
                Works on <strong>Google Chrome, Brave Browser, Microsoft Edge, and Opera</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#6B528E] hover:text-[#3B235C] hover:bg-[#EDE1FF] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Download Action Box */}
        <div className="relative z-10 p-5 rounded-2xl bg-[#FCFAFF] border border-[#B78AE8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#3B235C]">
              <FolderArchive className="h-4 w-4 text-[#8B4ED8]" />
              <span>Step 1: Download Extension Package (.zip)</span>
            </div>
            <p className="text-xs text-[#6B528E]">
              Generates complete Chromium extension bundle (<code className="text-[#8B4ED8] font-bold">manifest.json</code>, <code className="text-[#8B4ED8] font-bold">background.js</code>, <code className="text-[#8B4ED8] font-bold">content.js</code>, popup UI).
            </p>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B4ED8] hover:bg-[#783ec0] text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isDownloading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Building Package...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download Extension (.zip)</span>
              </>
            )}
          </button>
        </div>

        {/* Step-by-Step Interactive Guide */}
        <div className="relative z-10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B528E] font-mono">
            4-Step Quick Setup Guide
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Step 1 */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeStep === 1
                  ? 'bg-[#EDE1FF] border-[#8B4ED8] shadow-sm'
                  : 'bg-[#FCFAFF] border-[#CBA3F5] hover:bg-[#EDE1FF]/50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-[#3B235C]">
                <span className="h-5 w-5 rounded-full bg-[#8B4ED8] flex items-center justify-center text-[10px] text-white font-mono">1</span>
                <span>Extract the ZIP</span>
              </div>
              <p className="text-[11px] text-[#6B528E] mt-1.5 leading-relaxed">
                Right-click the downloaded <code className="text-[#8B4ED8] font-bold">crypticookie-manifest-v3-extension.zip</code> and select <strong>"Extract All"</strong> to a folder.
              </p>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeStep === 2
                  ? 'bg-[#EDE1FF] border-[#8B4ED8] shadow-sm'
                  : 'bg-[#FCFAFF] border-[#CBA3F5] hover:bg-[#EDE1FF]/50'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs text-[#3B235C]">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-[#8B4ED8] flex items-center justify-center text-[10px] text-white font-mono">2</span>
                  <span>Open Extensions Page</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl('chrome://extensions');
                  }}
                  className="flex items-center gap-1 text-[10px] text-[#8B4ED8] hover:text-[#3B235C] font-bold"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#6B528E] mt-1.5 leading-relaxed">
                In a new browser tab, type or paste <code className="text-emerald-700 font-mono font-bold">chrome://extensions</code> (or <code className="text-emerald-700 font-mono font-bold">brave://extensions</code> / <code className="text-emerald-700 font-mono font-bold">edge://extensions</code>).
              </p>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => setActiveStep(3)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-[#EDE1FF] border-[#8B4ED8] shadow-sm'
                  : 'bg-[#FCFAFF] border-[#CBA3F5] hover:bg-[#EDE1FF]/50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-[#3B235C]">
                <span className="h-5 w-5 rounded-full bg-[#8B4ED8] flex items-center justify-center text-[10px] text-white font-mono">3</span>
                <span>Enable Developer Mode</span>
              </div>
              <p className="text-[11px] text-[#6B528E] mt-1.5 leading-relaxed">
                Toggle the <strong>"Developer mode"</strong> switch in the top-right corner of the Extensions page to ON.
              </p>
            </div>

            {/* Step 4 */}
            <div
              onClick={() => setActiveStep(4)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeStep === 4
                  ? 'bg-[#EDE1FF] border-[#8B4ED8] shadow-sm'
                  : 'bg-[#FCFAFF] border-[#CBA3F5] hover:bg-[#EDE1FF]/50'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-[#3B235C]">
                <span className="h-5 w-5 rounded-full bg-[#8B4ED8] flex items-center justify-center text-[10px] text-white font-mono">4</span>
                <span>Click "Load Unpacked"</span>
              </div>
              <p className="text-[11px] text-[#6B528E] mt-1.5 leading-relaxed">
                Click the <strong>"Load unpacked"</strong> button in the top-left toolbar and select your extracted folder!
              </p>
            </div>
          </div>
        </div>

        {/* Live Features Once Installed */}
        <div className="relative z-10 p-3.5 rounded-2xl bg-[#EDE1FF] border border-[#B78AE8] flex items-center justify-between text-xs text-[#3B235C] font-semibold">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600 shrink-0 animate-pulse" />
            <span>Once loaded, every real website you open will be monitored and shielded in real-time!</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-[#8B4ED8] hover:bg-[#783ec0] text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
