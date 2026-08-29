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
      <div className="bg-gradient-to-r from-[#2e124f]/90 via-[#250d42]/90 to-[#2e124f]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/20 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Extension Source Code</h1>
          <p className="text-xs text-purple-200/80 mt-1">
            Manifest V3 browser extension files ready for development and ZIP export.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-bold text-white shadow-md shadow-pink-500/20 transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isDownloading ? 'Exporting...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>

      {/* SECTION 2: How to load Outer Container */}
      <div className="bg-gradient-to-b from-[#2a104a]/90 to-[#200b3b]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/20 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🚀 How to load and run this Extension in your real Chrome / Brave / Edge Browser</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-[#1e0a36] border border-purple-400/30 space-y-1 shadow-sm">
            <div className="font-bold text-pink-300">1. Download & Extract ZIP</div>
            <p className="text-purple-200/80 text-[11px]">
              Click <strong className="text-white">"Download Extension (.zip)"</strong> above and unzip the folder to your computer.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#1e0a36] border border-purple-400/30 space-y-1 shadow-sm">
            <div className="font-bold text-pink-300">2. Open chrome://extensions</div>
            <p className="text-purple-200/80 text-[11px]">
              Navigate to <code className="text-emerald-400 font-bold font-mono">chrome://extensions</code> and turn on <strong className="text-white">"Developer mode"</strong> (top right).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#1e0a36] border border-purple-400/30 space-y-1 shadow-sm">
            <div className="font-bold text-pink-300">3. Click "Load unpacked"</div>
            <p className="text-purple-200/80 text-[11px]">
              Select the unzipped folder. The Crypticookie Shield will now monitor your real browsing tabs!
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Code Browser Outer Container */}
      <div className="bg-gradient-to-b from-[#2a104a]/90 to-[#200b3b]/90 border border-purple-400/30 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-950/20 backdrop-blur-md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* File List */}
          <div className="rounded-2xl border border-purple-400/30 bg-[#1e0a36] p-3 space-y-1 shadow-md">
            <span className="text-[11px] font-mono font-bold text-purple-200 px-2 py-1 block">
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
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold shadow-sm'
                      : 'text-purple-200 hover:bg-[#371661]'
                  }`}
                >
                  <span>{file.name}</span>
                  <span className="text-[10px] opacity-80 font-semibold">{file.language}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-3 rounded-2xl border border-purple-400/30 bg-[#1e0a36] overflow-hidden flex flex-col shadow-md">
            <div className="flex items-center justify-between px-4 py-3 bg-[#2a104a] border-b border-purple-400/30 text-xs">
              <span className="font-mono font-bold text-white">{selectedFile.name}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-pink-300 hover:text-white font-bold transition-colors cursor-pointer font-mono text-[11px]"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-purple-100 overflow-x-auto max-h-[500px] leading-relaxed bg-[#150727]">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
