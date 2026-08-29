import React, { useState } from 'react';
import { UserCheck, Shield, ChevronDown, Plus, Check, Laptop } from 'lucide-react';
import { PRESET_CHROME_PROFILES } from '../lib/db';
import { type ChromeProfile } from '../types/database';

interface ChromeProfileSelectorProps {
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  compact?: boolean;
}

export const ChromeProfileSelector: React.FC<ChromeProfileSelectorProps> = ({
  activeProfileId,
  onSelectProfile,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState<ChromeProfile[]>(() => {
    const saved = localStorage.getItem('crypticookie_custom_profiles');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        return [...PRESET_CHROME_PROFILES, ...custom];
      } catch (e) {}
    }
    return PRESET_CHROME_PROFILES;
  });

  const [newProfileName, setNewProfileName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const handleAddNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newId = 'profile_' + Date.now().toString(36);
    const newProf: ChromeProfile = {
      id: newId,
      name: newProfileName.trim(),
      icon: '✨',
      color: '#a855f7',
      description: 'Custom Isolated Chrome Profile',
    };

    const updated = [...profiles, newProf];
    setProfiles(updated);

    // Save custom profiles
    const customOnly = updated.filter((p) => !PRESET_CHROME_PROFILES.some((preset) => preset.id === p.id));
    localStorage.setItem('crypticookie_custom_profiles', JSON.stringify(customOnly));

    onSelectProfile(newId);
    setNewProfileName('');
    setIsAddingNew(false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all cursor-pointer font-mono font-semibold ${
          compact
            ? 'px-2.5 py-1.5 bg-[#371661] hover:bg-[#471c7d] text-purple-100 border border-purple-400/40 text-xs shadow-sm'
            : 'px-3.5 py-2 bg-[#371661] hover:bg-[#471c7d] text-white border border-purple-400/40 text-xs shadow-md'
        }`}
      >
        <span className="text-sm">{activeProfile.icon}</span>
        <span className="truncate max-w-[140px] text-pink-300 font-bold">{activeProfile.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-950/80 text-pink-300 border border-pink-700/60 hidden sm:inline">
          ISOLATED
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-purple-200 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 rounded-2xl bg-gradient-to-b from-[#2e124f] to-[#1e0a36] border border-purple-400/35 shadow-2xl z-50 p-3 space-y-2.5 animate-fadeIn backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-purple-400/30 px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Laptop className="h-4 w-4 text-pink-400" />
              <span>Chrome Account Profiles</span>
            </div>
            <span className="text-[10px] text-purple-200/80 font-mono">Profile Storage Isolated</span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {profiles.map((p) => {
              const isSelected = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProfile(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-950/90 to-purple-950/90 border border-pink-500/50 text-white font-bold shadow-sm'
                      : 'hover:bg-[#3b1764]/70 text-purple-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{p.icon}</span>
                    <div>
                      <div className="font-semibold text-purple-100 flex items-center gap-1.5">
                        <span>{p.name}</span>
                      </div>
                      <p className="text-[10px] text-purple-200/70 leading-tight">{p.description}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-pink-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {!isAddingNew ? (
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#371661] hover:bg-[#471c7d] text-pink-300 border border-purple-400/35 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Create New Isolated Profile</span>
            </button>
          ) : (
            <form onSubmit={handleAddNewProfile} className="p-2 bg-[#250d42] rounded-xl border border-purple-400/30 space-y-2 shadow-inner">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile Name (e.g. Profile D)"
                autoFocus
                className="w-full bg-[#1e0a36] border border-purple-400/35 rounded-lg px-2.5 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-pink-500"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-2.5 py-1 text-[11px] text-purple-200/80 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-[11px] font-bold rounded-lg cursor-pointer shadow-sm"
                >
                  Add Profile
                </button>
              </div>
            </form>
          )}

          <div className="pt-1.5 border-t border-purple-400/30 text-[10px] text-purple-200/70 font-mono text-center">
            💡 Switch profiles to test 100% independent logs, website state, and consent status.
          </div>
        </div>
      )}
    </div>
  );
};
