
import React, { useState, useMemo } from 'react';
import { InterviewResult, ImprovementItem, CommunicationAnalysis } from '../types';
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
          <span className="text-slate-400 font-bold uppercase text-[9px]">Dominant Tone:</span>
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

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Strategic Post-Mortem</h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Strong Signals</p>
                <div className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-xs font-bold text-emerald-800 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3">Critical Gaps</p>
                <div className="space-y-2">
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                      <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs font-bold text-rose-800 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-800 text-white relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl group-hover:bg-indigo-600/30 transition-all"></div>
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-black tracking-tight">The Staff Benchmark</h3>
              <p className="text-slate-400 text-sm font-medium px-4">
                Reveal how an elite $500k/year Principal PM would tackle this exact problem using first principles.
              </p>
              <button 
                onClick={() => setShowBenchmark(!showBenchmark)}
                className="w-full mt-4 bg-white hover:bg-indigo-50 text-slate-900 font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 uppercase tracking-widest text-[10px]"
              >
                {showBenchmark ? 'Hide Benchmark' : 'Reveal Gold Standard Response'}
              </button>
            </div>

            {showBenchmark && (
              <div className="mt-8 pt-8 border-t border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ideal Executive Transcript</span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-slate-300 leading-relaxed font-medium space-y-4 whitespace-pre-wrap">
                    {result.benchmarkResponse}
                  </div>
                </div>
                <div className="mt-8 p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Coach's Note</p>
                  <p className="text-xs text-indigo-200/70 font-medium leading-relaxed">
                    Notice the lack of "framework filler" and the immediate focus on high-leverage strategic moats. This is what executive presence sounds like.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <CommunicationEvaluation analysis={result.communicationAnalysis} />

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Staff-Level Delta
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {cat} {cat !== 'All' ? `(${categoryStats[cat]})` : `(${result.improvementItems.length})`}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-t border-slate-50 pt-4">
                <span>View Mode:</span>
                <div className="flex bg-slate-50 p-1 rounded-lg">
                  <button
                    onClick={() => setSortBy('impact')}
                    className={`px-3 py-1 rounded-md transition ${sortBy === 'impact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    High Impact
                  </button>
                  <button
                    onClick={() => setSortBy('effort')}
                    className={`px-3 py-1 rounded-md transition ${sortBy === 'effort' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    Quick Wins
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {filteredAndSortedItems.map((item, i) => {
                const isExpanded = expandedItems.includes(item.originalIndex);
                return (
                  <div 
                    key={i} 
                    className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      isExpanded 
                        ? 'border-indigo-400 bg-indigo-50/30 shadow-md ring-1 ring-indigo-100' 
                        : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'
                    }`}
                    onClick={() => toggleItem(item.originalIndex)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          item.category === 'Structuring' ? 'bg-indigo-500' : 
                          item.category === 'Content' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex space-x-1.5">
                        <EffortBadge level={item.effort} />
                        <ImpactBadge level={item.impact} />
                      </div>
                    </div>
                    
                    <div className="flex items-start justify-between gap-4">
                       <p className={`text-sm text-slate-800 font-bold leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {item.action}
                      </p>
                      <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-indigo-100 space-y-5 animate-in fade-in slide-in-from-top-2">
                        <div>
                          <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Strategic Context (The Why)</p>
                          <p className="text-xs text-slate-600 leading-relaxed italic font-medium">
                            {item.whyItMatters}
                          </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-inner">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em] mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Tactical Implementation Guide
                          </p>
                          <div className="text-xs text-slate-700 leading-relaxed font-semibold space-y-4 whitespace-pre-wrap prose prose-sm prose-slate max-w-none">
                            {item.howTo}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Curated Deep Dives</h3>
            <div className="grid gap-3">
              {result.recommendedResources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                    {res.type === 'video' ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-tight mb-0.5">{res.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{res.type}</p>
                  </div>
                  <svg className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onReset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-14 rounded-2xl shadow-2xl shadow-indigo-200 transition transform hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest"
        >
          Master Next Case
        </button>
      </div>
    </div>
  );
};
