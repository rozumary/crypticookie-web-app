import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  Shield,
  Layers,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Laptop,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CrypticookieLogo } from './CrypticookieLogo';

interface TutorialGuideProps {
  onNavigateTab: (tab: string) => void;
}

export const TutorialGuide: React.FC<TutorialGuideProps> = ({ onNavigateTab }) => {
  const [activeTutorialStep, setActiveTutorialStep] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const tutorialSteps = [
    {
      step: 1,
      title: 'Audit Websites & Detect CMPs',
      badge: 'Step 1: Website Scanner',
      icon: Globe,
      description:
        'Audit any website domain (such as shopee.ph, lazada.com.ph, gcash.com) to instantly discover what Consent Management Platform (CMP) is present, intercept raw consent banner scripts, and detect tracking cookies.',
      actionText: 'Try in Extension Simulator',
      targetTab: 'simulator',
      highlights: [
        'Real-time CMP Banner Verification (OneTrust, Cookiebot, etc.)',
        'Automatic Tracker & Marketing Pixel Classification',
        'SHA-256 Cryptographic Script Integrity Check',
      ],
    },
    {
      step: 2,
      title: 'Make Informed Consent Choices',
      badge: 'Step 2: Privacy Shield',
      icon: Shield,
      description:
        'When viewing a detected cookie banner, select your desired privacy posture (Accept All, Necessary Only, or Reject All). Crypticookie actively applies strict blocking rules to prevent cross-site advertising trackers.',
      actionText: 'Go to Simulator',
      targetTab: 'simulator',
      highlights: [
        'One-click "Necessary Only" option to shield tracking data',
        'Visual risk rating analysis (Low, Moderate, High Risk)',
        'Immediate local & cloud event synchronization',
      ],
    },
    {
      step: 3,
      title: 'Verify Immutable Blockchain Ledgers',
      badge: 'Step 3: Blockchain Explorer',
      icon: Layers,
      description:
        'Every consent transaction you record is cryptographically signed and added as a block to the immutable chain. Inspect SHA-256 block hashes, previous block linkages, and public/private ledger records.',
      actionText: 'View Blockchain Explorer',
      targetTab: 'blockchain',
      highlights: [
        'Zero-Tamper Chain Integrity: Sequential SHA-256 hashes',
        'Dual-layer: Public Ledger (domain-level) & Private Ledger (audit-level)',
        'One-click block hash copy & verification tools',
      ],
    },
    {
      step: 4,
      title: 'Browse Known CMP Registry',
      badge: 'Step 4: CMP Registry',
      icon: FileCheck,
      description:
        'Explore our verified registry of international and regional Consent Management Providers. See verified script URLs, vendor fingerprints, and risk categorizations.',
      actionText: 'Explore CMP Registry',
      targetTab: 'cmp_registry',
      highlights: [
        'Whitelisted vs. Blacklisted CMP framework definitions',
        'Script source URL checksums and known tracker lists',
        'Real-time filter and search across providers',
      ],
    },
  ];

  const faqs = [
    {
      q: 'How does Crypticookie protect my privacy?',
      a: 'Crypticookie audits websites in real-time to detect cookie consent banners and third-party trackers (like Facebook Pixel and Google Ads). It logs your choices into an immutable blockchain ledger to guarantee your consent choices are cryptographically provable and unalterable.',
    },
    {
      q: 'What is the difference between the Public and Private Ledger?',
      a: 'The Public Ledger records anonymized site domain consent events that anyone can verify for transparency. The Private Ledger records encrypted user-specific audit entries only accessible by your auditor account.',
    },
    {
      q: 'How do I test a live website right now?',
      a: 'Navigate to the "Extension Simulator" from the sidebar or click the "Launch Simulator" button above, enter any website domain (e.g. shopee.ph or lazada.com.ph), and click "Audit". You can then test accepting or rejecting trackers and see real-time ledger blocks created.',
    },
    {
      q: 'Is my data synced across my browser and the cloud?',
      a: 'Yes! Crypticookie uses a hybrid architecture: lightning-fast local IndexedDB storage for offline speed, plus automatic real-time cloud synchronization to Firestore for persistent access across all devices.',
    },
  ];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header Container */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <BookOpen className="h-6 w-6 text-pink-400" />
                <span>Tutorial & User Guide</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1A0935] text-pink-300 text-[11px] font-mono border border-pink-500/30 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-pink-400" />
                Quickstart
              </span>
            </div>
            <p className="text-xs text-purple-300/70 mt-1">
              Step-by-step interactive instructions to audit websites, configure privacy shields, and inspect blockchain ledgers.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('simulator')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-lg shadow-pink-900/20 active:scale-95"
        >
          <Laptop className="h-4 w-4" />
          <span>Launch Simulator</span>
        </button>
      </div>

      {/* Interactive 4-Step Walkthrough Card */}
      <div className="bg-[#0F061F] border border-pink-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-pink-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#261445] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-600/30 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  How To Use Crypticookie
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 text-[11px] font-bold font-mono">
                  Walkthrough
                </span>
              </div>
              <p className="text-xs text-purple-300/70 mt-0.5">
                Select any step below to explore features with quick-jump action links.
              </p>
            </div>
          </div>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {tutorialSteps.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTutorialStep === idx;
            return (
              <button
                key={item.step}
                onClick={() => setActiveTutorialStep(idx)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#260B45] to-[#17072E] border-pink-500 text-white shadow-lg shadow-pink-900/20'
                    : 'bg-[#130729] border-[#29154A] text-purple-300/70 hover:text-purple-200 hover:bg-[#1A0935]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-pink-600 text-white' : 'bg-[#1D0938] text-purple-400'
                    }`}
                  >
                    0{item.step}
                  </span>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-pink-400' : 'text-purple-400/60'}`} />
                </div>
                <div className="text-xs font-bold truncate text-white">
                  {item.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Content Card */}
        {(() => {
          const currentStep = tutorialSteps[activeTutorialStep];
          const CurrentIcon = currentStep.icon;
          return (
            <div className="bg-[#130729] border border-[#29154A] rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-pink-950 text-pink-300 border border-pink-500/40 text-[11px] font-bold font-mono">
                      {currentStep.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CurrentIcon className="h-5 w-5 text-pink-400" />
                    <span>{currentStep.title}</span>
                  </h3>
                  <p className="text-xs text-purple-200/80 leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab(currentStep.targetTab)}
                  className="px-4 py-2.5 rounded-xl bg-[#220B40] hover:bg-pink-600 hover:text-white text-pink-300 border border-pink-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                >
                  <span>{currentStep.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Highlights Bullet Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#261445]">
                {currentStep.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-xl bg-[#1A0935]/80 border border-[#2D1652]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-purple-100 font-medium">{h}</span>
                  </div>
                ))}
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={activeTutorialStep === 0}
                  onClick={() => setActiveTutorialStep((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#1A0935] text-purple-300 text-xs font-semibold hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous Step
                </button>

                <div className="flex items-center gap-1.5">
                  {tutorialSteps.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveTutorialStep(i)}
                      className={`h-2 rounded-full cursor-pointer transition-all ${
                        activeTutorialStep === i ? 'w-6 bg-pink-500' : 'w-2 bg-[#2D1652] hover:bg-purple-500/50'
                      }`}
                    />
                  ))}
                </div>

                <button
                  disabled={activeTutorialStep === tutorialSteps.length - 1}
                  onClick={() => setActiveTutorialStep((prev) => Math.min(tutorialSteps.length - 1, prev + 1))}
                  className="px-3 py-1.5 rounded-xl bg-[#1A0935] text-pink-300 text-xs font-semibold hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Next Step →
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Frequently Asked Questions Card */}
      <div className="bg-[#0F061F] border border-[#261445] rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg shadow-purple-950/10">
        <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#261445] pb-4">
          <HelpCircle className="h-4 w-4 text-pink-400" />
          <span>Frequently Asked Questions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {faqs.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <div
                key={index}
                onClick={() => setExpandedFaq(isExpanded ? null : index)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isExpanded
                    ? 'bg-[#180833] border-pink-500/50 shadow-md shadow-pink-950/20'
                    : 'bg-[#130729] border-[#29154A] hover:border-pink-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`h-4 w-4 text-pink-400 shrink-0 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
                {isExpanded && (
                  <p className="text-xs text-purple-200/90 leading-relaxed pt-2 border-t border-[#261445] animate-fadeIn">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
