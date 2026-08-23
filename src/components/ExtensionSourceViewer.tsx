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
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isDownloading ? 'Exporting...' : 'Download Extension (.zip)'}</span>
        </button>
      </div>

      {/* Code Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* File List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 px-2 py-1 block">
            Bundle Files
          </span>

          {ALL_EXTENSION_FILES.map((file) => {
            const isSelected = selectedFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <span>{file.name}</span>
                <span className="text-[10px] opacity-70">{file.language}</span>
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#090d16] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <span className="font-mono text-slate-300">{selectedFile.name}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer font-mono text-[11px]"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
