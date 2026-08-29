import React, { useState, useEffect } from 'react';
import { Users, Check, ChevronDown } from 'lucide-react';
import { type User as UserType } from '../types/database';
import { db, INITIAL_DEMO_USERS } from '../lib/db';

interface UserAccountSwitcherProps {
  currentUser: UserType | null;
  onSelectUser: (user: UserType) => void;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onLogout: () => void;
  compact?: boolean;
}

export const UserAccountSwitcher: React.FC<UserAccountSwitcherProps> = ({
  currentUser,
  onSelectUser,
  onOpenSignIn,
  onOpenSignUp,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);

  const loadUsers = async () => {
    try {
      const users = await db.users.toArray();
      if (users.length > 0) {
        setAllUsers(users);
      } else {
        setAllUsers(INITIAL_DEMO_USERS);
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  };

  useEffect(() => {
    loadUsers();
    const handleSync = () => loadUsers();
    window.addEventListener('crypticookie_db_sync', handleSync);
    return () => window.removeEventListener('crypticookie_db_sync', handleSync);
  }, []);

  const activeUser = currentUser || allUsers[0] || INITIAL_DEMO_USERS[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        id="btn-user-account-switcher"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all cursor-pointer font-medium ${
          compact
            ? 'px-3 py-1.5 bg-[#140529] hover:bg-[#20093e] text-[#d8b4fe] border border-[#7e22ce]/40 text-xs'
            : 'px-3.5 py-2 bg-[#140529] hover:bg-[#20093e] text-white border border-[#7e22ce]/50 text-xs shadow-md'
        }`}
      >
        <div className="w-5 h-5 rounded-lg bg-[#6b21a8] border border-[#a855f7]/50 flex items-center justify-center text-white text-[10px] font-bold">
          {activeUser.username.charAt(0).toUpperCase()}
        </div>
        <span className="truncate max-w-[130px] font-semibold text-purple-100">{activeUser.username}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e0838] text-[#e879f9] border border-[#7e22ce]/40 hidden sm:inline font-mono">
          Account
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-purple-300/70 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0f041e] border border-[#3b1366] shadow-2xl z-50 p-3 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-[#22093e] px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Users className="h-4 w-4 text-[#e879f9]" />
              <span>Switch User Account</span>
            </div>
            <span className="text-[10px] text-[#c084fc] font-mono">Logs Isolated</span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto">
            {allUsers.map((u) => {
              const isSelected = activeUser.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#20093e] border border-[#9333ea]/60 text-white font-bold'
                      : 'hover:bg-[#16052b] text-purple-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-[#6b21a8] border border-[#a855f7]/50 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-purple-100 truncate">{u.username}</div>
                      <p className="text-[10px] text-purple-300/60 truncate">{u.email}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#e879f9] shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#22093e] grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onOpenSignIn();
                setIsOpen(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-[#140529] hover:bg-[#20093e] text-purple-200 hover:text-white border border-[#7e22ce]/40 text-[11px] font-semibold text-center transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                onOpenSignUp();
                setIsOpen(false);
              }}
              className="py-1.5 px-2 rounded-xl bg-[#7e22ce] hover:bg-[#6b21a8] text-white text-[11px] font-bold text-center transition-all cursor-pointer shadow-sm"
            >
              + New Account
            </button>
          </div>

          <div className="pt-1 text-[10px] text-[#c084fc]/70 font-mono text-center">
            💡 Each account has its own isolated cookie logs, audits, and private ledger.
          </div>
        </div>
      )}
    </div>
  );
};

