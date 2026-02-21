import React, { useState, useMemo } from 'react';
import { InterviewResult, ImprovementItem, CommunicationAnalysis } from '../types.ts';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface FeedbackViewProps {
  result: InterviewResult;
  onReset: () => void;
  isProductSense: boolean;
}

const EffortBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    High: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const colorClass = colors[level as keyof typeof colors] || colors.Medium;
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${colorClass}`}>
      {level} Effort
    </span>
  );
};

const ImpactBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    Low: 'bg-slate-100 text-slate-600 border-slate-200',
    Medium: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    High: 'bg-indigo-600 text-white border-indigo-700',
  };
  const colorClass = colors[level as keyof typeof colors] || colors.Medium;
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${colorClass}`}>
      {level} Impact
    </span>
  );
};

const CommunicationEvaluation: React.FC<{ analysis: CommunicationAnalysis }> = ({ analysis }) => {
  const assessmentColors = {
    'Strong': 'bg-emerald-500 text-white',
    'Average': 'bg-amber-500 text-white',
    'Needs Work': 'bg-rose-500 text-white'
  };

  const confidence = Math.min(10, Math.max(0, analysis.confidenceScore));
  const clarity = Math.min(10, Math.max(0, analysis.clarityScore));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Communication Quality</h3>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-1">Tone & Soft Skills</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${assessmentColors[analysis.overallAssessment] || assessmentColors.Average}`}>
          {analysis.overallAssessment}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confidence</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-800 leading-none">{confidence}</span>
            <span className="text-xs text-slate-400 font-medium mb-0.5">/10</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
            <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${confidence * 10}%` }}></div>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clarity</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-800 leading-none">{clarity}</span>
            <span className="text-xs text-slate-400 font-medium mb-0.5">/10</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${clarity * 10}%` }}></div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-slate-400 font-bold uppercase text-[9px]">Tone:</span>
          <span className="text-slate-700 font-semibold px-2 py-0.5 bg-slate-100 rounded-md">{analysis.tone}</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed italic">
          "{analysis.summary}"
        </p>
      </div>
    </div>
  );
};

export const FeedbackView: React.FC<FeedbackViewProps> = ({ result, onReset, isProductSense }) => {
  const [activeCategory, setActiveCategory] = useState<string | 'All'>('All');
  const [sortBy, setSortBy] = useState<'impact' | 'effort'>('impact');
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const toggleItem = (idx: number) => {
    setExpandedItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const radarData = result.rubricScores.map(rs => {
    let displayScore = rs.score;
    if (displayScore > 10) displayScore = displayScore / 10;
    displayScore = Math.min(10, Math.max(0, displayScore));
    
    return {
      subject: rs.category,
      A: displayScore,
      fullMark: 10
    };
  });

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    result.improvementItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [result.improvementItems]);

  const uniqueCategories = useMemo(() => {
    return ['All', ...Object.keys(categoryStats).sort()];
  }, [categoryStats]);

  const levelToValue = (level: string) => {
    switch (level) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let items = result.improvementItems.map((item, originalIndex) => ({ ...item, originalIndex }));
    if (activeCategory !== 'All') {
      items = items.filter(item => item.category === activeCategory);
    }
    items.sort((a, b) => {
      if (sortBy === 'impact') {
        return levelToValue(b.impact) - levelToValue(a.impact);
      } else {
        return levelToValue(b.effort) - levelToValue(a.effort);
      }
    });
    return items;
  }, [result.improvementItems, activeCategory, sortBy]);

  const methodologyName = isProductSense 
    ? "Principal Strategic Principles" 
    : "Executive Execution Standards";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
        <div className="space-y-2 text-center md:text-left relative z-10">
          <h2 className="text-3xl font-black tracking-tight">Executive Evaluation</h2>
          <p className="text-indigo-200/70 text-sm max-w-md">
            Measured against <span className="text-indigo-300 font-bold">{methodologyName}</span> for a Staff PM bar.
          </p>
        </div>
        <div className="flex items-center justify-center w-28 h-28 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 relative z-10">
          <div className="text-center">
            <span className="block text-4xl font-black leading-none">{Math.min(100, Math.max(0, result.overallScore))}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50 mt-1 block">Rating</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              Core Principles Audit
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Score /10</span>
            </h3>

            <div className="h-[280px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} axisLine={false} tick={false} />
                  <Radar name="Performance" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-6">
               {result.rubricScores.map((score, idx) => {
                 let displayScore = score.score;
                 if (displayScore > 10) displayScore = displayScore / 10;
                 displayScore = Math.min(10, Math.max(0, displayScore));

                 return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-800 tracking-tight">{score.category}</span>
                      <span className={`font-black text-xs px-2 py-0.5 rounded ${displayScore >= 8 ? 'bg-emerald-50 text-emerald-600' : displayScore >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                        {displayScore}/10
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{score.reasoning}</p>
                    <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${displayScore >= 8 ? 'bg-emerald-500' : displayScore >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${displayScore * 10}%` }}
                      ></div>
                    </div>
                  </div>
                 )
               })}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <CommunicationEvaluation analysis={result.communicationAnalysis} />

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center mb-6">
              Staff-Level Delta
            </h3>
            
            <div className="space-y-4 mb-8">
              {filteredAndSortedItems.map((item, i) => {
                const isExpanded = expandedItems.includes(item.originalIndex);
                return (
                  <div 
                    key={i} 
                    className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isExpanded 
                        ? 'border-indigo-400 bg-indigo-50/30' 
                        : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'
                    }`}
                    onClick={() => toggleItem(item.originalIndex)}
                  >
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {item.category}
                        </span>
                      <div className="flex space-x-1.5">
                        <EffortBadge level={item.effort} />
                        <ImpactBadge level={item.impact} />
                      </div>
                    </div>
                    <p className="text-sm text-slate-800 font-bold">{item.action}</p>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                        <p className="text-xs text-slate-600 italic">{item.whyItMatters}</p>
                        <p className="text-xs text-slate-700 font-semibold">{item.howTo}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onReset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-14 rounded-2xl transition text-lg uppercase tracking-widest"
        >
          Master Next Case
        </button>
      </div>
    </div>
  );
};