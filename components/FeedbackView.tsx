import React, { useState, useMemo } from 'react';
import { InterviewResult, ImprovementItem, CommunicationAnalysis, TranscriptAnnotation, GoldenPathStep } from '../types.ts';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface FeedbackViewProps {
  result: InterviewResult;
  onReset: () => void;
  onPracticeDelta: (item: ImprovementItem) => void;
  isProductSense: boolean;
}

const ImpactBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = { Low: 'bg-slate-100 text-slate-600 border-slate-200', Medium: 'bg-indigo-100 text-indigo-700 border-indigo-200', High: 'bg-indigo-600 text-white border-indigo-700' };
  const colorClass = colors[level as keyof typeof colors] || colors.Medium;
  return <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${colorClass}`}>{level} Impact</span>;
};

const AnnotationSpan: React.FC<{ annotation: TranscriptAnnotation }> = ({ annotation }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const styles = { 
    strength: 'bg-emerald-100/50 border-b-2 border-emerald-500 text-emerald-900 cursor-help', 
    weakness: 'bg-rose-100/50 border-b-2 border-rose-500 text-rose-900 cursor-help', 
    qualifier: 'bg-amber-100/50 border-b-2 border-amber-500 text-amber-900 cursor-help', 
    neutral: 'text-slate-700' 
  };

  if (annotation.type === 'neutral') return <span>{annotation.text} </span>;

  const rewrite = annotation.feedback?.split('REWRITE:')[1];
  const feedback = annotation.feedback?.split('REWRITE:')[0];

  return (
    <span 
      className={`relative inline-block px-0.5 transition-all mx-0.5 ${styles[annotation.type]}`} 
      onMouseEnter={() => setShowTooltip(true)} 
      onMouseLeave={() => setShowTooltip(false)}
    >
      {annotation.text}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-4 bg-slate-900 text-white text-[11px] rounded-2xl shadow-2xl z-50 font-medium leading-relaxed animate-in fade-in zoom-in-95">
          <span className="block font-black text-[9px] tracking-[0.2em] text-indigo-400 mb-2 uppercase">{annotation.type} Audit</span>
          {feedback}
          {rewrite && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <span className="block text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Staff-Level Alternative</span>
              <p className="italic text-slate-300">"{rewrite.trim()}"</p>
            </div>
          )}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></span>
        </span>
      )}
    </span>
  );
};

const BenchmarkScript: React.FC<{ text: string }> = ({ text }) => {
  const parts = useMemo(() => {
    const lines = text.split(/(?=\[.*?\]:)/g);
    return lines.map(line => {
      const match = line.match(/\[(.*?)\]:\s*(.*)/s);
      if (match) return { speaker: match[1], content: match[2] };
      return { speaker: null, content: line };
    });
  }, [text]);

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 no-scrollbar">
      {parts.map((p, i) => (
        <div key={i} className={`p-6 rounded-3xl ${p.speaker?.includes('Commentary') ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/5 border border-white/10'}`}>
          {p.speaker && (
            <span className={`text-[9px] font-black uppercase tracking-widest mb-3 block ${p.speaker?.includes('Commentary') ? 'text-indigo-400' : 'text-slate-400'}`}>
              {p.speaker}
            </span>
          )}
          <p className={`text-sm leading-relaxed ${p.speaker?.includes('Commentary') ? 'text-slate-400 italic font-medium' : 'text-slate-200 font-bold'}`}>
            {p.content}
          </p>
        </div>
      ))}
    </div>
  );
};

const HowToRenderer: React.FC<{ text: string }> = ({ text }) => {
  // Enhanced renderer to highlight comparisons
  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        if (!line.trim()) return null;
        
        // Check for PHRASING comparison
        if (line.includes('PHRASING:') || (line.includes('Instead of') && line.includes('say'))) {
          const parts = line.split(/(Instead of|say)/gi);
          return (
            <div key={idx} className="bg-white/40 p-4 rounded-2xl border border-indigo-100 mt-2">
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Staff Phrasing Audit</p>
              <div className="flex flex-col space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-rose-500 font-bold text-[10px] mt-0.5 whitespace-nowrap">Instead of:</span>
                  <span className="text-slate-400 text-[11px] font-medium line-through decoration-rose-500/20 italic">{line.split(/Instead of|say/i)[1]?.trim() || line}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold text-[10px] mt-0.5 whitespace-nowrap">Staff Path:</span>
                  <span className="text-indigo-700 text-[11px] font-black leading-relaxed">{line.split(/say/i)[1]?.trim() || 'Speak with more precision.'}</span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-[11px] text-slate-700 leading-relaxed font-bold">
            {line}
          </p>
        );
      })}
    </div>
  );
};

export const FeedbackView: React.FC<FeedbackViewProps> = ({ result, onReset, onPracticeDelta, isProductSense }) => {
  const [showBenchmarkScript, setShowBenchmarkScript] = useState(false);

  const commData = useMemo(() => [
    { category: 'Confidence', value: result.communicationAnalysis?.confidenceScore || 0, full: 100 },
    { category: 'Clarity', value: result.communicationAnalysis?.clarityScore || 0, full: 100 },
    { category: 'Structure', value: result.overallScore || 0, full: 100 },
    { category: 'Vision', value: result.visionScore || 0, full: 100 },
    { category: 'Defense', value: result.defenseScore || 0, full: 100 },
  ], [result]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* EXECUTIVE SCOREBOARD */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
          <div className="space-y-4 max-w-xl text-center lg:text-left">
            <span className="bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/30">Executive Audit Result</span>
            <h2 className="text-5xl font-black tracking-tighter">Strategic Mastery</h2>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex flex-col">
                 <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">The Framework Gap</p>
                 <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400 line-through decoration-rose-500/50">{result.userLogicPath || 'Unstructured'}</span>
                    <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    <span className="text-sm font-black text-indigo-300">Staff Strategic Path</span>
                 </div>
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                 <div>
                    <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Stability Index</p>
                    <p className={`text-sm font-bold ${result.defensivePivotScore >= 8 ? 'text-emerald-400' : 'text-rose-400'}`}>{result.defensivePivotScore || 0}/10</p>
                 </div>
                 <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${result.defensivePivotScore >= 8 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(result.defensivePivotScore || 0) * 10}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Communication Profile</p>
              <div className="flex items-center space-x-3">
                 <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">{result.communicationAnalysis?.tone || 'Neutral'} Tone</span>
                 <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{result.communicationAnalysis?.summary}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden lg:block w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={commData}>
                    <PolarGrid stroke="#ffffff20" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 800 }} />
                    <Radar name="Performance" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
             </div>
             
             <div className="text-center ml-4">
                <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex flex-col items-center justify-center shadow-2xl border-4 border-indigo-500/30 ring-8 ring-indigo-600/10">
                   <span className="text-5xl font-black text-white">{result.overallScore}</span>
                   <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mt-1">Rating</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* RUBRIC BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {result.rubricScores?.map((r, i) => (
           <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors cursor-default">
              <div className="flex justify-between items-center mb-2">
                 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.category}</h5>
                 <span className={`text-sm font-black ${r.score >= 80 ? 'text-emerald-500' : r.score >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{r.score}</span>
              </div>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{r.reasoning}</p>
           </div>
         ))}
      </div>

      {/* BENCHMARK SECTION (GOLDEN PATH) */}
      <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white space-y-12 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-widest text-indigo-400">The Staff Golden Path</h3>
              <p className="text-xs text-slate-400 font-bold">Strategic outlines highlighting what to reject and why.</p>
           </div>
           <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
              <button onClick={() => setShowBenchmarkScript(false)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!showBenchmarkScript ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>The Logic</button>
              <button onClick={() => setShowBenchmarkScript(true)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${showBenchmarkScript ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>The Script</button>
           </div>
        </div>

        {showBenchmarkScript ? (
          <BenchmarkScript text={result.benchmarkResponse} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {result.goldenPath?.map((step, i) => (
              <div key={i} className="flex flex-col space-y-5 p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/40 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-5xl font-black text-indigo-500/10 group-hover:text-indigo-500/30 transition-colors">0{i+1}</span>
                    <div className="w-10 h-1 bg-indigo-500/20 rounded-full mt-6"></div>
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <h5 className="font-black text-[13px] uppercase text-indigo-300 leading-tight tracking-wide">{step.title}</h5>
                    <p className="text-xs text-slate-300 font-bold leading-relaxed">{step.content}</p>
                  </div>

                  <div className="space-y-4 pt-5 border-t border-white/5 mt-auto relative z-10">
                    <div className="space-y-1.5">
                      <span className="font-black text-indigo-500 text-[9px] block uppercase tracking-widest">Core Logic</span>
                      <p className="text-[11px] italic text-slate-400 font-medium leading-relaxed">{step.why}</p>
                    </div>

                    <div className="bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 group-hover:bg-rose-500/20 transition-all">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-3 h-3 text-rose-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        <span className="font-black text-rose-400 text-[9px] block uppercase tracking-widest">Rejected Path</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                        {step.strategicTradeOffs || "No specific trade-offs identified."}
                      </p>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELTA OPPORTUNITIES */}
      <div className="space-y-8">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Growth Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {result.improvementItems?.map((item, i) => (
             <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:border-indigo-400 transition-all flex flex-col justify-between group">
                <div className="space-y-6">
                   <div className="flex justify-between items-start">
                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg w-fit">{item.category}</span>
                        <h5 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors mt-2">{item.action}</h5>
                      </div>
                      <ImpactBadge level={item.impact} />
                   </div>
                   
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.whyItMatters}</p>
                   
                   <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <div className="flex items-center space-x-2 mb-5">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Step-By-Step Phrasing Guide</p>
                      </div>
                      <HowToRenderer text={item.howTo} />
                   </div>
                </div>
                <button onClick={() => onPracticeDelta(item)} className="mt-10 w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.25em] hover:bg-indigo-700 transition shadow-xl active:scale-95 transform hover:-translate-y-1">Practice This Phrase</button>
             </div>
           ))}
        </div>
      </div>

      <div className="flex justify-center pt-16">
        <button onClick={onReset} className="bg-slate-900 hover:bg-black text-white font-black py-7 px-24 rounded-[2.5rem] transition-all shadow-2xl text-xl uppercase tracking-[0.4em] transform hover:scale-105 active:scale-95">Master Next Case</button>
      </div>
    </div>
  );
};