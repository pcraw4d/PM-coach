
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
            <span className="text-2xl font-bold text-slate-800 leading-none">{analysis.confidenceScore}</span>
            <span className="text-xs text-slate-400 font-medium mb-0.5">/10</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
            <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${analysis.confidenceScore * 10}%` }}></div>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clarity</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-slate-800 leading-none">{analysis.clarityScore}</span>
            <span className="text-xs text-slate-400 font-medium mb-0.5">/10</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${analysis.clarityScore * 10}%` }}></div>
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

  const radarData = result.rubricScores.map(rs => ({
    subject: rs.category,
    A: rs.score,
    fullMark: 10
  }));

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
    let items = [...result.improvementItems];
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
    ? "Industry Standard Product Sense Guide" 
    : "Industry Standard Execution Guide";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-bold">Analysis Complete</h2>
          <p className="text-indigo-100 max-w-md">
            Your response has been evaluated against the 
            <span className="font-bold underline decoration-indigo-300 ml-1">{methodologyName}</span>.
          </p>
        </div>
        <div className="flex items-center justify-center w-28 h-28 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20">
          <div className="text-center">
            <span className="block text-3xl font-black leading-none">{result.overallScore}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Overall</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              Performance Breakdown
              <span className="text-xs font-normal text-slate-400">Scale: 1-10</span>
            </h3>

            <div className="h-[280px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar name="Performance" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
               {result.rubricScores.map((score, idx) => (
                 <div key={idx} className="space-y-1 border-l-2 border-indigo-100 pl-4">
                   <div className="flex justify-between text-sm">
                     <span className="font-semibold text-slate-700">{score.category}</span>
                     <span className="font-bold text-indigo-600">{score.score}/10</span>
                   </div>
                   <p className="text-xs text-slate-500 leading-relaxed">{score.reasoning}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Key Strengths
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-slate-600 flex items-start text-sm">
                  <span className="text-indigo-500 mr-2">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <CommunicationEvaluation analysis={result.communicationAnalysis} />

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex flex-col space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Actionable Growth Plan
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
                <span>Priority:</span>
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
              {filteredAndSortedItems.map((item, i) => (
                <div key={i} className="group p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
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
                  <p className="text-sm text-slate-800 font-semibold leading-relaxed">
                    {item.action}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Learning Paths</h3>
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-14 rounded-3xl shadow-2xl transition transform hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest"
        >
          Practice Next Question
        </button>
      </div>
    </div>
  );
};
