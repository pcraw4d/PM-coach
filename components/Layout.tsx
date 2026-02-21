import React from 'react';
import { User } from '../types.ts';

interface HeaderProps {
  user: User;
  onShowHistory: () => void;
  onShowHome: () => void;
  onShowSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onShowHistory, onShowHome, onShowSettings }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={onShowHome}
          >
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">PM Coach AI</span>
          </div>
          
          <nav className="flex items-center space-x-4 sm:space-x-8">
            <button 
              onClick={onShowHome}
              className="text-[11px] font-black text-slate-500 hover:text-indigo-600 transition uppercase tracking-widest"
            >
              Missions
            </button>
            <button 
              onClick={onShowHistory}
              className="flex items-center space-x-2 text-[11px] font-black text-slate-500 hover:text-indigo-600 transition uppercase tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Journal</span>
            </button>
            
            <button 
              onClick={onShowSettings}
              className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center hover:bg-white hover:border-indigo-500 transition shadow-sm overflow-hidden"
            >
               <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatarSeed}`} 
                alt="Me"
                className="w-8 h-8"
               />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
    {children}
  </main>
);