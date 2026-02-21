
import React, { useState, useMemo, useEffect } from 'react';

interface AccessGateProps {
  onGrantAccess: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onGrantAccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  // We use a variety of literal checks. 
  // Bundlers perform a find-and-replace on these EXACT strings.
  const isEnvConfigured = useMemo(() => {
    // Check various common literal patterns
    const hasKey = !!(
      process.env.ACCESS_KEY || 
      process.env.VITE_ACCESS_KEY || 
      process.env.REACT_APP_ACCESS_KEY
    );
    
    // Check Vite-specific meta env
    let hasMeta = false;
    try {
      // @ts-ignore
      hasMeta = !!(import.meta.env?.VITE_ACCESS_KEY || import.meta.env?.ACCESS_KEY);
    } catch (e) {}

    return hasKey || hasMeta;
  }, []);

  useEffect(() => {
    console.log("[Vault] Security module initialized.");
    if (!isEnvConfigured) {
      console.warn("[Vault] Configuration check: Environment variables not explicitly detected by static scan. If login fails, ensure Vercel variables are set and a new deployment was triggered.");
    }
  }, [isEnvConfigured]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = passcode.trim();
    
    if (!input) return;

    // Use multiple literal comparisons. 
    // The bundler replaces these exact tokens with the value of your environment variable.
    const match1 = input === process.env.ACCESS_KEY;
    const match2 = input === process.env.VITE_ACCESS_KEY;
    const match3 = input === process.env.REACT_APP_ACCESS_KEY;
    
    let matchMeta = false;
    try {
      // @ts-ignore
      matchMeta = (input === import.meta.env.VITE_ACCESS_KEY) || (input === import.meta.env.ACCESS_KEY);
    } catch (e) {}

    if (match1 || match2 || match3 || matchMeta) {
      localStorage.setItem('pm_app_access_token', input);
      onGrantAccess();
    } else {
      setError(true);
      console.error("[Vault] Access Denied: Provided key does not match any configured environment variable.");
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

            <div className="w-full p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 mt-4">
              <p className="text-slate-400 text-[9px] font-bold leading-relaxed uppercase tracking-wider">
                Note: Ensure you have <strong>redeployed</strong> your project after adding variables in Vercel to apply changes.
              </p>
            </div>
            
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
