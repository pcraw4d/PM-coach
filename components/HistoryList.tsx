import React, { useMemo } from 'react';
import { HistoryItem, InterviewType } from '../types.ts';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (interview: any) => void;
  onClear: () => void;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  color: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.activityType === 'MISSION') return null;
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
          {new Date(data.timestamp).toLocaleDateString()}
        </p>
        <p className="text-white text-xs font-semibold mb-1 max-w-[200px] line-clamp-2">
          {data.title}
        </p>
        <p className="text-indigo-400 font-black text-lg">
          Score: {data.score}
        </p>
      </div>
    );
  }
  return null;
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onClear }) => {
  const gamification = useMemo(() => {
    if (history.length === 0) return null;

    const totalXP = history.reduce((acc, item) => {
      if (item.activityType === 'INTERVIEW') {
        let xp = 100 + (item.result.overallScore * 2);
        if (item.result.overallScore >= 85) xp += 50;
        return acc + xp;
      } else {
        return acc + (item as any).xpAwarded;
      }
    }, 0);

    const level = Math.floor(totalXP / 1000) + 1;
    const currentLevelXP = totalXP % 1000;
    const progressToNextLevel = (currentLevelXP / 1000) * 100;

    const interviews = history.filter(h => h.activityType === 'INTERVIEW') as any[];
    const scores = interviews.map(h => h.result.overallScore);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const psScores = interviews.filter(h => h.type === InterviewType.PRODUCT_SENSE).map(h => h.result.overallScore);

    const badges: Badge[] = [
      {
        id: 'first_step',
        name: 'First Step',
        description: 'Complete your first activity.',
        icon: '🚀',
        unlocked: history.length >= 1,
        color: 'bg-blue-100 text-blue-600'
      }
    ];

    const chartData = [...history]
      .filter(h => h.activityType === 'INTERVIEW')
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((h: any) => ({
        timestamp: h.timestamp,
        score: h.result.overallScore,
        title: h.questionTitle,
        activityType: h.activityType
      }));

    return { totalXP, level, currentLevelXP, progressToNextLevel, badges, chartData, maxScore };
  }, [history]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
        <h3 className="text-xl font-bold text-slate-900 mb-2">No history yet</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Level {gamification?.level} Product Leader</h2>
        </div>
      </div>

      <div className="grid gap-4">
        {history.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
          <div
            key={item.id}
            className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex-1">
              <span className="text-xs text-slate-400">{formatDate(item.timestamp)}</span>
              <h4 className="text-lg font-bold text-slate-800">
                {item.activityType === 'MISSION' ? (item as any).title : (item as any).questionTitle}
              </h4>
            </div>
            {item.activityType === 'INTERVIEW' && (
              <button onClick={() => onSelect(item)} className="text-indigo-600 font-bold">View Feedback</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};