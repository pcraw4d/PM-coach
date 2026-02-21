
import React, { useState, useMemo, useEffect } from 'react';

interface AccessGateProps {
  onGrantAccess: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onGrantAccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  // Diagnostic: Identify which keys the bundler actually injected
  useEffect(() => {
    const diagnostic = {
      // Fix: Cast import.meta to any to resolve TS error for env access
      VITE_ACCESS_KEY: !!((import.meta as any).env && (import.meta as any).env.VITE_ACCESS_KEY),
      PROCESS_VITE_KEY: !!(typeof process !== 'undefined' && process.env.VITE_ACCESS_KEY),
      PROCESS_ACCESS_KEY: !!(typeof process !== 'undefined' && process.env.ACCESS_KEY),
    };
    console.log("[Vault] Environment Variable Availability Check:", diagnostic);
  }, []);

  const isEnvConfigured = useMemo(() => {
    // Vite-style check
    // Fix: Cast import.meta to any to resolve TS error for env access
    const viteKey = (import.meta as any).env?.VITE_ACCESS_KEY || (import.meta as any).env?.ACCESS_KEY;
    if (viteKey) return true;

    // Process-style check
    if (typeof process !== 'undefined' && process.env) {
      return !!(process.env.VITE_ACCESS_KEY || process.env.ACCESS_KEY || process.env.REACT_APP_ACCESS_KEY);
    }
    
    return false;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = passcode.trim();
    
    if (!input) return;

    // 1. Check Vite-style replacements (Literal strings for the bundler)
    // Fix: Cast import.meta to any to resolve TS error for env access
    const matchesViteMeta = input === (import.meta as any).env.VITE_ACCESS_KEY;
    const matchesMeta = input === (import.meta as any).env.ACCESS_KEY;

    // 2. Check Process-style replacements
    const matchesProcessVite = typeof process !== 'undefined' && input === process.env.VITE_ACCESS_KEY;
    const matchesProcessAccess = typeof process !== 'undefined' && input === process.env.ACCESS_KEY;
    const matchesProcessReact = typeof process !== 'undefined' && input === process.env.REACT_APP_ACCESS_KEY;

    if (matchesViteMeta || matchesMeta || matchesProcessVite || matchesProcessAccess || matchesProcessReact) {
      localStorage.setItem('pm_app_access_token', input);
      onGrantAccess();
    } else {
      setError(true);
      console.error("[Vault] Access Denied: Key mismatch.");
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
                    Access Denied
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

            {!isEnvConfigured && (
              <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mt-4">
                <p className="text-amber-500 text-[9px] font-bold leading-relaxed uppercase tracking-wider text-left">
                   ⚠️ Setup Required: <br/>
                   1. Add <strong>VITE_ACCESS_KEY</strong> in Vercel. <br/>
                   2. Trigger a <strong>New Deployment</strong>.
                </p>
              </div>
            )}
            
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
