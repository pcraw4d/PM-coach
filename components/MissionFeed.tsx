import React from 'react';
import { KnowledgeMission } from '../types.ts';

interface MissionFeedProps {
  missions: KnowledgeMission[];
  onComplete: (id: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const MissionFeed: React.FC<MissionFeedProps> = ({ missions, onComplete, isLoading, onRefresh }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Daily Growth Missions</h3>
        <div className="flex space-x-4 overflow-hidden py-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[280px] h-[180px] bg-slate-100 rounded-[2rem] animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Daily Growth</h3>
        <button 
          onClick={onRefresh}
          className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center space-x-1"
        >
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex space-x-6 overflow-x-auto pb-6 -mx-4 px-4 no-scrollbar">
        {missions.map((mission) => (
          <div 
            key={mission.id}
            className={`min-w-[300px] max-w-[300px] flex flex-col justify-between p-6 rounded-[2rem] border transition-all ${
              mission.isCompleted 
                ? 'bg-slate-50 opacity-60' 
                : 'bg-white border-slate-200 hover:border-indigo-400'
            }`}
          >
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{mission.source}</p>
              <h4 className="text-sm font-black text-slate-900 line-clamp-2">{mission.title}</h4>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{mission.summary}</p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50">
              {mission.isCompleted ? (
                <span className="text-emerald-600 text-[10px] font-black uppercase">Completed</span>
              ) : (
                <a 
                  href={mission.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setTimeout(() => onComplete(mission.id), 2000)}
                  className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Start Mission
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};