
import React, { useState } from 'react';

interface AccessGateProps {
  onGrantAccess: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onGrantAccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const expectedKey = (process.env as any).ACCESS_KEY;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === expectedKey) {
      localStorage.setItem('pm_app_access_token', passcode);
      onGrantAccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-indigo-500/30">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-8">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center shadow-inner">
              <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Personal PM Vault</h1>
              <p className="text-slate-500 text-sm font-medium">
                Identity verification required for access.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Access Key"
                  autoFocus
                  className={`w-full bg-slate-800/50 border ${
                    error ? 'border-rose-500 animate-shake' : 'border-slate-700'
                  } text-white px-6 py-5 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-center tracking-widest placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal`}
                />
                {error && (
                  <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-2">
                    Invalid Key
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                Unlock Repository
              </button>
            </form>
            
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] pt-4">
              Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};
