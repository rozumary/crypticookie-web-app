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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Extension Source Code</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manifest V3 browser extension files ready for development and ZIP export.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-violet-950/50 transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isDownloading ? 'Exporting...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>

      {/* Visual Step-by-Step Installation Guide */}
      <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026] p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🚀 How to load and run this Extension in your real Chrome / Brave / Edge Browser</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#060a17] border border-blue-900/40 space-y-1">
            <div className="font-semibold text-violet-300">1. Download & Extract ZIP</div>
            <p className="text-blue-200/70 text-[11px]">
              Click <strong>"Download Extension (.zip)"</strong> above and unzip the folder to your computer.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#060a17] border border-blue-900/40 space-y-1">
            <div className="font-semibold text-violet-300">2. Open chrome://extensions</div>
            <p className="text-blue-200/70 text-[11px]">
              Navigate to <code className="text-emerald-400">chrome://extensions</code> and turn on <strong>"Developer mode"</strong> (top right).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#060a17] border border-blue-900/40 space-y-1">
            <div className="font-semibold text-violet-300">3. Click "Load unpacked"</div>
            <p className="text-blue-200/70 text-[11px]">
              Select the unzipped folder. The Crypticookie Shield will now monitor your real browsing tabs!
            </p>
          </div>
        </div>
      </div>

      {/* Code Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* File List */}
        <div className="rounded-2xl border border-blue-900/40 bg-[#0b1026]/90 p-3 space-y-1 shadow-sm">
          <span className="text-[11px] font-mono text-blue-300/70 px-2 py-1 block">
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
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold shadow-sm'
                    : 'text-blue-300/70 hover:bg-violet-950/30 hover:text-white'
                }`}
              >
                <span>{file.name}</span>
                <span className="text-[10px] opacity-70">{file.language}</span>
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-3 rounded-2xl border border-blue-900/40 bg-[#060a17] overflow-hidden flex flex-col shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b1026] border-b border-blue-900/40 text-xs">
            <span className="font-mono text-blue-200">{selectedFile.name}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-blue-300/70 hover:text-white transition-colors cursor-pointer font-mono text-[11px]"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-blue-100/90 overflow-x-auto max-h-[500px] leading-relaxed">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
