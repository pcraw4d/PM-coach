import React, { useMemo, useState } from 'react';
import { HistoryItem, InterviewType, AggregatedWeaknessProfile, WeaknessPattern } from '../types.ts';
import { computeWeaknessProfile } from '../utils/weaknessAggregator.ts';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis
} from 'recharts';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (result: any) => void;
  onClear: () => void;
}

const WeaknessIntelligencePanel: React.FC<{ history: HistoryItem[] }> = ({ history }) => {
  const profile = useMemo(() => computeWeaknessProfile(history), [history]);
  const hasEnoughData = profile.topWeaknesses.length >= 2;

  if (!hasEnoughData) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-2xl">🌱</div>
        <div>
          <h3 className="text-xl font-black text-indigo-900 mb-1">Pattern Recognition Active</h3>
          <p className="text-indigo-600/80 font-medium text-sm max-w-md mx-auto">
            Complete at least 2 interview sessions to unlock AI-driven weakness analysis and trend tracking.
          </p>
        </div>
      </div>
    );
  }

  const topWeakness = profile.topWeaknesses[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Primary Focus Area */}
      <div className="lg:col-span-2 bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-500/20 text-rose-400 p-2 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Critical Focus Area</span>
          </div>

          <div>
            <h3 className="text-3xl font-black mb-2 tracking-tight">{topWeakness.category}</h3>
            <p className="text-slate-400 font-medium leading-relaxed max-w-xl">
              This area has flagged in <span className="text-white font-bold">{topWeakness.sessionCount} sessions</span> with an average score of <span className="text-white font-bold">{topWeakness.averageScore}</span>. 
              {topWeakness.trend === 'regressing' && " Performance is trending downward."}
              {topWeakness.trend === 'plateauing' && " Progress has stalled here."}
              {topWeakness.trend === 'improving' && " You are showing signs of improvement."}
            </p>
          </div>

          {topWeakness.recurringActions.length > 0 && (
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Recurring Feedback Patterns</p>
              <div className="space-y-3">
                {topWeakness.recurringActions.map((action, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                    <p className="text-sm font-medium text-slate-300">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trend Cards */}
      <div className="space-y-4">
        {profile.topWeaknesses.slice(0, 3).map((weakness, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-all">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {weakness.category.length > 20 ? weakness.category.substring(0, 20) + '...' : weakness.category}
              </p>
              <h4 className="text-lg font-black text-slate-900">{weakness.averageScore} <span className="text-[10px] text-slate-400 font-bold">AVG</span></h4>
            </div>
            
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              weakness.trend === 'improving' ? 'bg-emerald-50 text-emerald-600' :
              weakness.trend === 'regressing' ? 'bg-rose-50 text-rose-600' :
              'bg-slate-50 text-slate-400'
            }`}>
              {weakness.trend === 'improving' && <TrendingUp className="w-5 h-5" />}
              {weakness.trend === 'regressing' && <TrendingDown className="w-5 h-5" />}
              {weakness.trend === 'plateauing' && <Minus className="w-5 h-5" />}
            </div>
          </div>
        ))}
        
        {profile.topWeaknesses.length < 3 && (
           <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-dashed border-slate-200 h-full flex items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">More data needed for full trend analysis</p>
           </div>
        )}

        {/* Prescribed Reading Section */}
        {history.some(h => h.activityType === 'MISSION') && (
          <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Prescribed Reading</h4>
            <div className="space-y-4">
              {/* Group missions by targeted skill */}
              {Object.entries(
                history
                  .filter(h => h.activityType === 'MISSION')
                  .reduce((acc, mission) => {
                    const skill = mission.targetedSkill || 'General Knowledge';
                    if (!acc[skill]) acc[skill] = [];
                    acc[skill].push(mission);
                    return acc;
                  }, {} as Record<string, typeof history>)
              ).slice(0, 3).map(([skill, missions], i) => (
                <div key={i} className="space-y-2">
                  {skill !== 'General Knowledge' && (
                    <div className="flex items-center space-x-2 px-1">
                      <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        For {skill}
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {missions.slice(0, 2).map((mission, j) => (
                      <a key={j} href={mission.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-4 rounded-2xl border border-indigo-100 hover:border-indigo-300 transition-all group relative overflow-hidden">
                        {/* Subtle progress bar for completed missions if we had that data here, but we don't track read status on history items yet */}
                        <div className="relative z-10">
                          <p className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                            {mission.title}
                          </p>
                          {skill === 'General Knowledge' && (
                            <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Foundation</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">
          {new Date(data.timestamp).toLocaleDateString()}
        </p>
        <p className="text-white text-[11px] font-bold mb-2 max-w-[180px] leading-tight">
          {data.title}
        </p>
        <div className="flex items-center space-x-2">
           <span className="text-2xl font-black text-white">{payload[0].value}</span>
           <span className="text-[10px] text-slate-500 font-black uppercase">Score</span>
        </div>
      </div>
    );
  }
  return null;
};

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onClear }) => {
  const [activeCategory, setActiveCategory] = useState<'overall' | 'vision' | 'execution'>('overall');

  const analytics = useMemo(() => {
    const interviews = history
      .filter(h => h.activityType === 'INTERVIEW')
      .sort((a, b) => a.timestamp - b.timestamp) as any[];

    if (interviews.length === 0) return null;

    // Mapping engine to normalize dynamic rubric labels into pillars
    const getPillarScore = (item: any, pillar: 'vision' | 'execution' | 'user' | 'logic') => {
      const scores = item.result?.rubricScores || [];
      const relevant = scores.filter((s: any) => {
        const cat = s.category.toLowerCase();
        if (pillar === 'vision') return cat.includes('vision') || cat.includes('clarify') || cat.includes('mission');
        if (pillar === 'user') return cat.includes('user') || cat.includes('persona') || cat.includes('empathy');
        if (pillar === 'logic') return cat.includes('logic') || cat.includes('framework') || cat.includes('mece') || cat.includes('analytical');
        return cat.includes('prioritize') || cat.includes('metric') || cat.includes('trade-off') || cat.includes('root') || cat.includes('action');
      });
      
      if (relevant.length === 0) return item.result?.overallScore || 0;
      return Math.round(relevant.reduce((a: any, b: any) => a + b.score, 0) / relevant.length);
    };

    // Build timeline data
    const chartData = interviews.filter(h => h.result).map((h) => ({
      timestamp: h.timestamp,
      overall: h.result.overallScore,
      vision: getPillarScore(h, 'vision'),
      execution: getPillarScore(h, 'execution'),
      title: h.questionTitle,
    }));

    // Build Radar Data (Aggregated Skill Profile)
    const radarData = [
      { subject: 'Strategy', A: Math.round(interviews.filter(h => h.result).reduce((acc, h) => acc + getPillarScore(h, 'vision'), 0) / interviews.length) },
      { subject: 'Users', A: Math.round(interviews.filter(h => h.result).reduce((acc, h) => acc + getPillarScore(h, 'user'), 0) / interviews.length) },
      { subject: 'Logic', A: Math.round(interviews.filter(h => h.result).reduce((acc, h) => acc + getPillarScore(h, 'logic'), 0) / interviews.length) },
      { subject: 'Execution', A: Math.round(interviews.filter(h => h.result).reduce((acc, h) => acc + getPillarScore(h, 'execution'), 0) / interviews.length) },
      { subject: 'Comm', A: Math.round(interviews.filter(h => h.result).reduce((acc, h) => acc + (h.result.communicationAnalysis?.confidenceScore || 70), 0) / interviews.length) },
    ];

    // Growth Delta Calculations
    const midPoint = Math.ceil(interviews.length / 2);
    const firstHalf = interviews.slice(0, midPoint);
    const lastHalf = interviews.slice(-midPoint);
    
    const calcAvg = (arr: any[], key: 'overall' | 'vision' | 'execution') => {
      const validArr = arr.filter(item => item.result);
      if (validArr.length === 0) return 0;
      if (key === 'overall') return validArr.reduce((a, b) => a + b.result.overallScore, 0) / validArr.length;
      return validArr.reduce((a, b) => a + getPillarScore(b, key), 0) / validArr.length;
    };

    const improvements = {
      overall: Math.round(calcAvg(lastHalf, 'overall') - calcAvg(firstHalf, 'overall')),
      vision: Math.round(calcAvg(lastHalf, 'vision') - calcAvg(firstHalf, 'vision')),
      execution: Math.round(calcAvg(lastHalf, 'execution') - calcAvg(firstHalf, 'execution')),
    };

    const mostImproved = Object.entries(improvements).sort((a, b) => b[1] - a[1])[0];

    // Gamification
    const totalXP = history.reduce((acc, item) => {
      if (item.activityType === 'INTERVIEW' && item.result) {
        let xp = 100 + (item.result.overallScore * 2);
        if (item.result.overallScore >= 85) xp += 50;
        return acc + xp;
      }
      return acc + (item.xpAwarded || 25);
    }, 0);

    const validInterviews = interviews.filter(h => h.result);
    if (validInterviews.length === 0) return { level: Math.floor(totalXP / 1000) + 1, chartData: [], radarData: [], mostImproved: ['overall', 0], maxScore: 0, avgScore: 0 };

    return { 
      level: Math.floor(totalXP / 1000) + 1, 
      chartData, 
      radarData,
      mostImproved,
      maxScore: Math.max(...validInterviews.map(h => h.result.overallScore)),
      avgScore: Math.round(validInterviews.reduce((acc, h) => acc + h.result.overallScore, 0) / validInterviews.length)
    };
  }, [history]);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }).format(new Date(ts));
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">📓</div>
        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Your Journal is Empty</h3>
        <p className="text-slate-400 font-bold max-w-xs mx-auto">Complete your first session to begin tracking your PM evolution.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block">Career Progression</span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Level {analytics?.level} Product Leader</h2>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Stability</p>
              <p className="text-xl font-black text-indigo-600">Staff Rank</p>
           </div>
           <button onClick={onClear} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
           </button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Skill Velocity</h3>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['overall', 'vision', 'execution'] as const).map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={activeCategory} stroke="#4f46e5" strokeWidth={4} fill="url(#colorActive)" animationDuration={1200} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              <div className="space-y-6 relative z-10">
                <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Growth engine</h3>
                
                <div className="h-40 w-full mb-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.radarData}>
                         <PolarGrid stroke="#ffffff10" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 800 }} />
                         <Radar name="Expertise" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.6} />
                      </RadarChart>
                   </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Max XP/Sess</p>
                    <p className="text-xl font-black">{analytics.maxScore}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Improved</p>
                    <p className="text-xl font-black text-emerald-400">+{analytics.mostImproved[1]} pts</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 relative z-10">
                 <div className="flex items-center space-x-3 text-emerald-400 bg-emerald-400/5 p-3 rounded-2xl border border-emerald-400/10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    <p className="text-[9px] font-black uppercase tracking-widest">Status: Positive Velocity</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <WeaknessIntelligencePanel history={history} />

      <div className="space-y-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Activity Feed</h3>
        <div className="grid gap-4">
          {history.sort((a, b) => b.timestamp - a.timestamp).map((item) => (
            <div key={item.id} className="group flex flex-col md:flex-row md:items-center justify-between p-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${item.activityType === 'MISSION' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                   {item.activityType === 'MISSION' ? '📖' : '🎙️'}
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatDate(item.timestamp)}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${item.activityType === 'MISSION' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {item.activityType}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">{item.activityType === 'MISSION' ? item.title : item.questionTitle}</h4>
                </div>
              </div>

              <div className="mt-4 md:mt-0 flex items-center gap-6">
                {item.activityType === 'INTERVIEW' && item.result && (
                  <div className="flex items-center gap-4 mr-4">
                    {analytics && item.result.overallScore > analytics.avgScore && (
                       <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">Above Avg</span>
                    )}
                    <div className="text-right">
                       <span className="text-2xl font-black text-slate-900">{item.result.overallScore}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase ml-1">pts</span>
                    </div>
                  </div>
                )}
                {item.activityType === 'MISSION' && <span className="text-emerald-500 font-black text-sm pr-4">+{item.xpAwarded} XP</span>}
                {item.activityType === 'INTERVIEW' && (
                  <button onClick={() => onSelect({ ...item.result, question: item.questionTitle })} className="bg-slate-900 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg transform active:scale-95">View Audit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};