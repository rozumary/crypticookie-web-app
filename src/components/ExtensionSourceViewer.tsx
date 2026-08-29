import React, { useState } from 'react';
import {
  Code2,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import {
  ALL_EXTENSION_FILES,
  downloadExtensionZip,
  type ExtensionFile,
} from '../lib/extensionBuilder';

export const ExtensionSourceViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<ExtensionFile>(ALL_EXTENSION_FILES[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadExtensionZip();
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Header Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3B235C] tracking-tight">Extension Source Code</h1>
          <p className="text-xs text-[#6B528E] mt-1">
            Manifest V3 browser extension files ready for development and ZIP export.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B4ED8] hover:bg-[#783ec0] text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isDownloading ? 'Exporting...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>

      {/* SECTION 2: How to load Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5 space-y-4">
        <h3 className="text-sm font-bold text-[#3B235C] flex items-center gap-2">
          <span>🚀 How to load and run this Extension in your real Chrome / Brave / Edge Browser</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-[#FCFAFF] border border-[#CBA3F5] space-y-1">
            <div className="font-bold text-[#8B4ED8]">1. Download & Extract ZIP</div>
            <p className="text-[#6B528E] text-[11px]">
              Click <strong>"Download Extension (.zip)"</strong> above and unzip the folder to your computer.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FCFAFF] border border-[#CBA3F5] space-y-1">
            <div className="font-bold text-[#8B4ED8]">2. Open chrome://extensions</div>
            <p className="text-[#6B528E] text-[11px]">
              Navigate to <code className="text-emerald-700 font-bold font-mono">chrome://extensions</code> and turn on <strong>"Developer mode"</strong> (top right).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FCFAFF] border border-[#CBA3F5] space-y-1">
            <div className="font-bold text-[#8B4ED8]">3. Click "Load unpacked"</div>
            <p className="text-[#6B528E] text-[11px]">
              Select the unzipped folder. The Crypticookie Shield will now monitor your real browsing tabs!
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Code Browser Outer Container */}
      <div className="bg-[#FFFFFF] border border-[#B78AE8] rounded-3xl p-6 sm:p-8 shadow-md shadow-purple-900/5">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* File List */}
          <div className="rounded-2xl border border-[#CBA3F5] bg-[#FCFAFF] p-3 space-y-1 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-[#3B235C] px-2 py-1 block">
              Bundle Files
            </span>

            {ALL_EXTENSION_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#8B4ED8] text-white font-bold shadow-sm'
                      : 'text-[#3B235C] hover:bg-[#EDE1FF]'
                  }`}
                >
                  <span>{file.name}</span>
                  <span className="text-[10px] opacity-80 font-semibold">{file.language}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-3 rounded-2xl border border-[#CBA3F5] bg-[#FCFAFF] overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-[#EDE1FF] border-b border-[#CBA3F5] text-xs">
              <span className="font-mono font-bold text-[#3B235C]">{selectedFile.name}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[#8B4ED8] hover:text-[#3B235C] font-bold transition-colors cursor-pointer font-mono text-[11px]"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-[#3B235C] overflow-x-auto max-h-[500px] leading-relaxed bg-[#FFFFFF]">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
