
import React, { useState } from 'react';
import { User } from '../types';

interface SettingsViewProps {
  user: User;
  onUpdate: (updates: Partial<User>) => void;
  onDeleteAccount: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdate, onDeleteAccount, onBack }) => {
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email); // Read-only for now
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    onUpdate({ name });
  };

  const regenerateAvatar = () => {
    onUpdate({ avatarSeed: Math.random().toString(36).substring(7) });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-4 mb-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-8 border-b border-slate-50">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatarSeed}`} 
                  alt="Avatar"
                  className="w-full h-full"
                />
              </div>
              <button 
                onClick={regenerateAvatar}
                className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-sm text-slate-400 font-medium">Member since {new Date(user.joinedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Contact Support to Change)</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-400 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={name === user.name}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg transition transform active:scale-95 uppercase tracking-widest text-xs"
          >
            Save Profile Changes
          </button>
        </div>

        <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 space-y-4">
          <h3 className="text-lg font-bold text-rose-900">Danger Zone</h3>
          <p className="text-sm text-rose-700 leading-relaxed font-medium">
            Deleting your account is permanent. All of your practice history, XP, and achievements will be erased immediately.
          </p>
          {isDeleting ? (
            <div className="flex items-center space-x-3 pt-2">
              <button 
                onClick={() => { setIsDeleting(false); onDeleteAccount(); }}
                className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md"
              >
                Yes, Delete My Data
              </button>
              <button 
                onClick={() => setIsDeleting(false)}
                className="bg-white text-slate-600 px-6 py-3 rounded-xl font-bold text-sm border border-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="text-rose-600 font-bold text-sm hover:underline underline-offset-4"
            >
              Delete my account permanently
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
