import React from 'react';
import { KnowledgeMission } from '../types.ts';

interface MissionFeedProps {
  missions: KnowledgeMission[];
  onComplete: (id: string) => void;
  isLoading: boolean;
  isRevalidating?: boolean;
  onRefresh: () => void;
}

export const MissionFeed: React.FC<MissionFeedProps> = ({ missions, onComplete, isLoading, isRevalidating, onRefresh }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Scanning Growth Horizon</h3>
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <div className="flex flex-col space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full h-[240px] bg-white border border-slate-100 rounded-[2.5rem] p-7 space-y-4 animate-pulse relative overflow-hidden">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-slate-100 rounded"></div>
                <div className="h-3 w-10 bg-slate-50 rounded"></div>
              </div>
              <div className="h-6 w-full bg-slate-100 rounded"></div>
              <div className="h-6 w-2/3 bg-slate-100 rounded"></div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-50 rounded"></div>
                <div className="h-3 w-4/5 bg-slate-50 rounded"></div>
              </div>
              <div className="absolute bottom-7 left-7 right-7 h-12 bg-slate-100 rounded-2xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Daily Growth</h3>
          {isRevalidating && (
            <div className="flex items-center space-x-1.5 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 animate-in fade-in zoom-in duration-300">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Syncing Latest...</span>
            </div>
          )}
        </div>
        <button 
          onClick={onRefresh}
          disabled={isRevalidating}
          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center space-x-1 disabled:opacity-50 transition-colors"
        >
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col space-y-6">
        {missions.map((mission) => {
          // Robust XP fallback to avoid "N/A"
          const displayXP = mission.xpAwarded && !isNaN(Number(mission.xpAwarded)) ? mission.xpAwarded : 25;
          
          return (
            <div 
              key={mission.id}
              className={`w-full flex flex-col justify-between p-7 rounded-[2.5rem] border transition-all duration-300 ${
                mission.isCompleted 
                  ? 'bg-slate-50 border-transparent opacity-60 grayscale' 
                  : 'bg-white border-slate-100 hover:border-indigo-400 shadow-sm hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">{mission.source}</p>
                  <span className="text-[9px] font-black text-slate-400">+{displayXP} XP</span>
                </div>
                <h4 className="text-lg font-black text-slate-900 leading-snug">{mission.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{mission.summary}</p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-50">
                {mission.isCompleted ? (
                  <div className="flex items-center justify-center space-x-2 py-3">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Knowledge Unlocked</span>
                  </div>
                ) : (
                  <a 
                    href={mission.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Start local completion timer
                      setTimeout(() => onComplete(mission.id), 1000);
                    }}
                    className="block w-full bg-slate-900 hover:bg-black text-white text-center py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                  >
                    Deep Dive
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {missions.length === 0 && !isLoading && (
          <div className="w-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No missions discovered for today.</p>
            <button onClick={onRefresh} className="mt-2 text-indigo-600 font-black text-[10px] uppercase">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
};