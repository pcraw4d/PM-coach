import React, { useMemo } from 'react';
import { HistoryItem, InterviewType } from '../types';
import { computeWeaknessProfile } from '../utils/weaknessAggregator';
import { RUBRICS } from '../constants';
import { Target, ArrowRight, BrainCircuit, Lightbulb } from 'lucide-react';

interface PreSessionBriefingProps {
  history: HistoryItem[];
}

export const PreSessionBriefing: React.FC<PreSessionBriefingProps> = ({ history }) => {
  const profile = useMemo(() => computeWeaknessProfile(history), [history]);
  
  if (profile.topWeaknesses.length < 1) {
    return null;
  }

  const topWeakness = profile.topWeaknesses[0];
  
  // Determine which interview type this weakness belongs to
  const isProductSense = RUBRICS[InterviewType.PRODUCT_SENSE].includes(topWeakness.category);
  const recommendedType = isProductSense ? InterviewType.PRODUCT_SENSE : InterviewType.ANALYTICAL_THINKING;
  
  const secondaryWeakness = profile.topWeaknesses[1];

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 shadow-xl border border-slate-700/50 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Target className="w-3 h-3" />
                Coach's Briefing
              </span>
            </div>
            
            <div>
              <h3 className="text-xl font-black text-white tracking-tight mb-1">
                Focus on <span className="text-indigo-400">{topWeakness.category}</span> today.
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                This has been a recurring gap in your last {topWeakness.sessionCount} sessions. 
                {secondaryWeakness && (
                  <span> Also keep an eye on <span className="text-slate-300 font-bold">{secondaryWeakness.category}</span>.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm shrink-0 w-full md:w-auto">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              recommendedType === InterviewType.PRODUCT_SENSE 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {recommendedType === InterviewType.PRODUCT_SENSE ? <Lightbulb className="w-5 h-5" /> : <BrainCircuit className="w-5 h-5" />}
            </div>
            
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Recommended Session</p>
              <p className="text-sm font-bold text-white">
                {recommendedType === InterviewType.PRODUCT_SENSE ? 'Product Sense' : 'Analytical Thinking'}
              </p>
            </div>
            
            <ArrowRight className="w-4 h-4 text-slate-500 ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
