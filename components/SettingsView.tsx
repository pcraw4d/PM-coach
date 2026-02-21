import React, { useState } from 'react';
import { User } from '../types.ts';

interface SettingsViewProps {
  user: User;
  onUpdate: (updates: Partial<User>) => void;
  onDeleteAccount: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUpdate, onDeleteAccount, onBack }) => {
  const [name, setName] = useState(user.name);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = () => {
    onUpdate({ name });
    alert("Profile Updated");
  };

  const regenerateAvatar = () => {
    onUpdate({ avatarSeed: Math.random().toString(36).substring(7) });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-4 mb-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Profile</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center space-x-6 pb-8 border-b border-slate-50">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatarSeed}`} 
                  alt="Avatar"
                  className="w-full h-full"
                />
              </div>
              <button 
                onClick={regenerateAvatar}
                className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Elite PM Candidate</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Joined {new Date(user.joinedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hero Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
              />
            </div>
            
            <button
              onClick={handleSave}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition transform active:scale-95 uppercase tracking-widest text-[10px]"
            >
              Update Identity
            </button>
          </div>
        </div>

        <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100 space-y-4">
          <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Erase Progress</h3>
          <p className="text-sm text-rose-700 leading-relaxed font-bold">
            Warning: This will permanently delete your XP, levels, and entire interview journal from this device.
          </p>
          {isResetting ? (
            <div className="flex items-center space-x-3 pt-2">
              <button 
                onClick={onDeleteAccount}
                className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg"
              >
                Destroy All Data
              </button>
              <button 
                onClick={() => setIsResetting(false)}
                className="bg-white text-slate-600 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsResetting(true)}
              className="text-rose-600 font-black text-[10px] uppercase tracking-widest hover:underline"
            >
              Reset local session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};