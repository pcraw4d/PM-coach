
import React, { useMemo } from 'react';
import { StoredInterview, InterviewType } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface HistoryListProps {
  history: StoredInterview[];
  onSelect: (interview: StoredInterview) => void;
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
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
          {new Date(data.timestamp).toLocaleDateString()}
        </p>
        <p className="text-white text-xs font-semibold mb-1 max-w-[200px] line-clamp-2">
          {data.questionTitle}
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

    // Calculate XP: 100 base per interview + (Score * 2) + 50 bonus for 85+
    const totalXP = history.reduce((acc, item) => {
      let xp = 100 + (item.result.overallScore * 2);
      if (item.result.overallScore >= 85) xp += 50;
      return acc + xp;
    }, 0);

    const level = Math.floor(totalXP / 1000) + 1;
    const currentLevelXP = totalXP % 1000;
    const progressToNextLevel = (currentLevelXP / 1000) * 100;

    const scores = history.map(h => h.result.overallScore);
    const maxScore = Math.max(...scores);
    const psScores = history.filter(h => h.type === InterviewType.PRODUCT_SENSE).map(h => h.result.overallScore);
    const atScores = history.filter(h => h.type === InterviewType.ANALYTICAL_THINKING).map(h => h.result.overallScore);

    const badges: Badge[] = [
      {
        id: 'first_step',
        name: 'First Step',
        description: 'Complete your first interview practice.',
        icon: '🚀',
        unlocked: history.length >= 1,
        color: 'bg-blue-100 text-blue-600'
      },
      {
        id: 'persistent_pm',
        name: 'Persistent PM',
        description: 'Complete 5 interview sessions.',
        icon: '💪',
        unlocked: history.length >= 5,
        color: 'bg-orange-100 text-orange-600'
      },
      {
        id: 'product_visionary',
        name: 'Product Visionary',
        description: 'Achieve a score of 90+ in Product Sense.',
        icon: '🎨',
        unlocked: psScores.some(s => s >= 90),
        color: 'bg-indigo-100 text-indigo-600'
      },
      {
        id: 'data_detective',
        name: 'Data Detective',
        description: 'Achieve a score of 90+ in Analytical Thinking.',
        icon: '🔍',
        unlocked: atScores.some(s => s >= 90),
        color: 'bg-emerald-100 text-emerald-600'
      },
      {
        id: 'interview_pro',
        name: 'Elite PM',
        description: 'Average a score of 85+ across at least 3 sessions.',
        icon: '👑',
        unlocked: history.length >= 3 && (scores.reduce((a, b) => a + b, 0) / scores.length) >= 85,
        color: 'bg-purple-100 text-purple-600'
      }
    ];

    const chartData = [...history]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(h => ({
        timestamp: h.timestamp,
        score: h.result.overallScore,
        questionTitle: h.questionTitle,
        type: h.type
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
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No history yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto">Start your first practice session to earn XP and unlock achievements!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Level {gamification?.level} Product Manager</h2>
          <p className="text-slate-500 font-medium">You've earned <span className="text-indigo-600 font-bold">{gamification?.totalXP} XP</span> so far</p>
        </div>
        <div className="w-full md:w-64">
           <div className="flex justify-between items-end mb-1">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress to Lvl {gamification ? gamification.level + 1 : 2}</span>
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{Math.round(gamification?.currentLevelXP || 0)} / 1000 XP</span>
           </div>
           <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
             <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${gamification?.progressToNextLevel}%` }}></div>
           </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Unlocked Achievements</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {gamification?.badges.map((badge) => (
            <div 
              key={badge.id} 
              className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${
                badge.unlocked 
                  ? `${badge.color} border-transparent shadow-sm scale-100` 
                  : 'bg-slate-50 text-slate-300 border-slate-100 opacity-50 grayscale scale-95'
              }`}
            >
              <div className="text-3xl mb-2">{badge.icon}</div>
              <p className={`text-[11px] font-bold uppercase tracking-tight text-center ${badge.unlocked ? '' : 'text-slate-400'}`}>
                {badge.name}
              </p>
              {!badge.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest">
            Score Progression
          </h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gamification?.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  animationDuration={1500}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="space-y-4">
          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">High Score</p>
             <div className="flex items-end gap-2">
                <span className="text-5xl font-black leading-none">{gamification?.maxScore}</span>
                <span className="text-xs font-bold opacity-60 mb-1">BEST EVER</span>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total XP Earned</p>
             <p className="text-3xl font-black text-slate-900">{gamification?.totalXP.toLocaleString()}</p>
             <div className="mt-3 flex items-center text-[10px] text-emerald-600 font-bold uppercase">
               <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
               </svg>
               Ranking up fast
             </div>
          </div>
          <button 
            onClick={() => { if(confirm("Clear history? You will lose all XP and badges.")) onClear(); }}
            className="w-full py-4 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition"
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4 pt-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Practice Log</h3>
        <div className="grid gap-4">
          {history.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left"
            >
              <div className="flex-1 space-y-1 pr-4">
                <div className="flex items-center space-x-3 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    item.type === InterviewType.PRODUCT_SENSE 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{formatDate(item.timestamp)}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition">
                  {item.questionTitle}
                </h4>
              </div>

              <div className="mt-4 md:mt-0 flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Result</p>
                  <p className={`text-2xl font-black ${
                    item.result.overallScore >= 80 ? 'text-emerald-600' : 
                    item.result.overallScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {item.result.overallScore}
                  </p>
                </div>
                <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
