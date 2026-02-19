
import React from 'react';

export const Header: React.FC = () => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">PM Coach AI</span>
        </div>
        <nav className="flex space-x-4">
          <span className="text-sm font-medium text-slate-500 hover:text-indigo-600 cursor-pointer transition">Practice</span>
          <span className="text-sm font-medium text-slate-500 hover:text-indigo-600 cursor-pointer transition">Frameworks</span>
        </nav>
      </div>
    </div>
  </header>
);

export const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    {children}
  </main>
);
