import React, { useState, useEffect } from 'react';
import { Download, Laptop, Smartphone, CheckCircle2, X, Sparkles, Monitor, ShieldCheck } from 'lucide-react';

interface InstallPWAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPWAModal: React.FC<InstallPWAModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instruction trigger
      setInstallSuccess(true);
      setTimeout(() => {
        setInstallSuccess(false);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-[#3D1E6D] bg-gradient-to-br from-[#231247] via-[#170B33] to-[#280F48] p-6 sm:p-8 space-y-6 relative text-purple-100 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#1A0935] hover:bg-[#280D4B] text-purple-300 hover:text-white transition-colors cursor-pointer border border-pink-500/20"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-900/30">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Install Crypticookie App</h2>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[10px] font-mono font-bold">
                PWA Desktop & Mobile
              </span>
            </div>
            <p className="text-xs text-purple-300/80 mt-0.5">
              Run Crypticookie as a standalone desktop app or mobile app with offline access!
            </p>
          </div>
        </div>

        {/* Install Status or Alert */}
        {installSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Installation requested! Check your device home screen or app launcher.</span>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#190C36] border border-[#33185E] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Monitor className="h-4 w-4 text-pink-400" />
              <span>Standalone Window</span>
            </div>
            <p className="text-[11px] text-purple-300/70">
              Opens like a native desktop app without browser tabs.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#190C36] border border-[#33185E] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <ShieldCheck className="h-4 w-4 text-pink-400" />
              <span>Instant Privacy</span>
            </div>
            <p className="text-[11px] text-purple-300/70">
              Quick access to website privacy audits & cookie helpers.
            </p>
          </div>
        </div>

        {/* Step by step install instructions */}
        <div className="space-y-3 bg-[#190C36] border border-[#33185E] p-4 rounded-2xl">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span>How to install on your device:</span>
          </div>

          <div className="space-y-2 text-[11px] text-purple-200">
            <div className="flex items-start gap-2">
              <Laptop className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Desktop (Chrome / Edge / Brave):</strong>
                <p className="text-purple-300/80">Click the <b>Install Icon</b> (or ⊕ icon) in your browser address bar or click "Install Now" below.</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Mobile (iOS / Android):</strong>
                <p className="text-purple-300/80">Tap the <b>Share / Menu</b> button in Safari or Chrome, then choose <b>"Add to Home Screen"</b>.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#1A0935] hover:bg-[#250B42] text-xs font-semibold text-purple-300 border border-pink-500/20 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleInstallClick}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-pink-900/40 flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{deferredPrompt ? 'Install App Now' : 'Add to Home Screen / Desktop'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
