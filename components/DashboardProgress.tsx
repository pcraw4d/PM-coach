import React, { useMemo } from 'react';
import { HistoryItem, InterviewType } from '../types.ts';

interface DashboardProgressProps {
  history: HistoryItem[];
}

export const DashboardProgress: React.FC<DashboardProgressProps> = ({ history }) => {
  const stats = useMemo(() => {
    const totalXP = history.reduce((acc, item) => {
      if (item.activityType === 'INTERVIEW' && item.result) {
        // Base 100 XP + performance bonus
        let xp = 100 + (item.result.overallScore * 2);
        if (item.result.overallScore >= 85) xp += 50; // Elite bonus
        return acc + xp;
      } else {
        return acc + (item.xpAwarded || 0);
      }
    }, 0);

    const level = Math.floor(totalXP / 1000) + 1;
    const currentLevelXP = totalXP % 1000;
    const progressToNextLevel = (currentLevelXP / 1000) * 100;

    return { level, currentLevelXP, progressToNextLevel, totalXP };
  }, [history]);

  return (
    <div className="w-full space-y-3 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Standing</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">Level {stats.level}</span>
            <span className="text-indigo-600 font-bold text-sm tracking-tight">{stats.totalXP.toLocaleString()} Total XP</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress to Lvl {stats.level + 1}</p>
          <p className="text-xs font-bold text-slate-600 tracking-tight">{Math.floor(stats.progressToNextLevel)}%</p>
        </div>
      </div>
      
      <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden border border-slate-100 p-0.5">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
          style={{ width: `${stats.progressToNextLevel}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
};