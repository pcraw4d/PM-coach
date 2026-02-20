
import React, { useState } from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onShowHistory: () => void;
  onShowHome: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onShowHistory, onShowHome, onLogout }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={onShowHome}
          >
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">PM Coach AI</span>
          </div>
          
          <nav className="flex items-center space-x-6">
            {user && (
              <>
                <button 
                  onClick={onShowHome}
                  className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition hidden sm:block"
                >
                  Practice
                </button>
                <button 
                  onClick={onShowHistory}
                  className="flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">History</span>
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 overflow-hidden">
                       <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatarSeed}`} 
                        alt="Avatar"
                        className="w-full h-full"
                       />
                    </div>
                  </button>
                  
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-slate-50 mb-1">
                        <p className="text-xs font-black text-slate-900 truncate">{user.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => { setShowProfileMenu(false); onLogout(); }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 font-bold hover:bg-rose-50 transition"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    {children}
  </main>
);
