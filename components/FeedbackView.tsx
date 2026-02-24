import React, { useState, useMemo } from 'react';
import { InterviewResult, ImprovementItem, CommunicationAnalysis, TranscriptAnnotation, GoldenPathStep, UserLogicStep } from '../types.ts';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Zap, 
  MessageSquare, 
  Target, 
  TrendingUp,
  ShieldAlert,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Award,
  Info,
  X
} from 'lucide-react';

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

const AnnotationSpan = React.forwardRef<HTMLSpanElement, { annotation: TranscriptAnnotation; isActive?: boolean; onClick?: () => void }>(
  ({ annotation, isActive, onClick }, ref) => {
    const styles = { 
      strength: 'bg-emerald-100/50 border-b-2 border-emerald-500 text-emerald-900 cursor-pointer', 
      weakness: 'bg-rose-100/50 border-b-2 border-rose-500 text-rose-900 cursor-pointer', 
      qualifier: 'bg-amber-100/50 border-b-2 border-amber-500 text-amber-900 cursor-pointer', 
      neutral: 'text-slate-700' 
    };

    const activeStyles = isActive 
      ? 'ring-4 ring-indigo-500/40 bg-indigo-50/90 scale-[1.05] z-20 shadow-xl border-indigo-500 !border-b-4' 
      : 'hover:scale-[1.02] hover:z-10';

    if (annotation.type === 'neutral') return <span className="text-slate-500">{annotation.text} </span>;

    return (
      <motion.span 
        ref={ref}
        onClick={onClick}
        layoutId={annotation.uid}
        className={`relative inline-block px-1 py-0.5 transition-all mx-0.5 rounded-md border-b-2 font-bold ${styles[annotation.type]} ${activeStyles}`} 
      >
        {annotation.text}
        {isActive && (
          <motion.div 
            layoutId="active-glow"
            className="absolute -inset-1 bg-indigo-500/10 rounded-lg -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}
      </motion.span>
    );
  }
);
AnnotationSpan.displayName = 'AnnotationSpan';

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
  // Enhanced renderer to highlight comparisons and steps
  const lines = text.split('\n');
  return (
    <div className="space-y-6">
      {lines.map((line, idx) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        // Check for PHRASING comparison
        if (trimmedLine.includes('PHRASING:') || (trimmedLine.includes('Instead of') && trimmedLine.includes('say'))) {
          return (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm mt-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Staff Phrasing Audit</p>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-rose-500 font-black text-[10px] mt-1 uppercase tracking-tighter shrink-0">Avoid:</span>
                  <span className="text-slate-400 text-[12px] font-medium line-through decoration-rose-500/30 italic leading-relaxed">
                    {trimmedLine.split(/Instead of|say/i)[1]?.trim() || trimmedLine}
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-600 font-black text-[10px] mt-1 uppercase tracking-tighter shrink-0">Staff:</span>
                  <span className="text-indigo-900 text-[13px] font-black leading-relaxed">
                    {trimmedLine.split(/say/i)[1]?.trim() || 'Speak with more precision.'}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // Check for numbered steps
        if (/^\d+\./.test(trimmedLine)) {
          return (
            <div key={idx} className="flex items-start space-x-4">
              <span className="text-indigo-500 font-black text-sm mt-0.5">{trimmedLine.split('.')[0]}.</span>
              <p className="text-[12px] text-slate-700 leading-relaxed font-bold">
                {trimmedLine.replace(/^\d+\.\s*/, '')}
              </p>
            </div>
          );
        }

        return (
          <p key={idx} className="text-[12px] text-slate-700 leading-relaxed font-bold">
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
};

const LogicFlowchart: React.FC<{ userPath: UserLogicStep[]; goldenPath: GoldenPathStep[] }> = ({ userPath, goldenPath }) => {
  const hits = userPath.filter(step => step.isAligned).length;
  const completionRate = Math.round((hits / Math.max(userPath.length, 1)) * 100);

  return (
    <div className="bg-slate-900 p-12 lg:p-16 rounded-[4rem] text-white shadow-2xl border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent)] pointer-events-none"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-20 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black uppercase tracking-tighter text-white">Strategic Logic Flow</h3>
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">User Logic Path Analysis</span>
              </div>
            </div>
          </div>
          <p className="text-slate-400 font-bold text-base max-w-2xl leading-relaxed">
            Staff PMs build a logical chain where every link is essential. Gaps in your logic are highlighted as 
            <span className="text-rose-400 font-black mx-2 px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">Missing Links</span>.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] flex items-center gap-8 shrink-0 hover:bg-white/10 transition-all group">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/10" />
              <motion.circle 
                initial={{ strokeDashoffset: 226.2 }}
                animate={{ strokeDashoffset: 226.2 * (1 - completionRate / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={226.2} className="text-indigo-500" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black group-hover:scale-110 transition-transform">{completionRate}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logic Integrity</p>
            <p className="text-2xl font-black text-white">{hits}/{userPath.length} Aligned</p>
            <div className="flex gap-1">
              {userPath.map((step, i) => (
                <div key={i} className={`h-1 w-4 rounded-full ${step.isAligned ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex flex-col space-y-0">
          {userPath.map((stepObj, i) => {
            const isAligned = stepObj.isAligned;
            const nextIsAligned = i < userPath.length - 1 ? userPath[i+1].isAligned : true;
            
            // Try to find a matching golden step for the tooltip
            const matchingGoldenStep = goldenPath.find(gs => 
              gs.title.toLowerCase().split(' ').some(kw => kw.length > 4 && stepObj.step.toLowerCase().includes(kw))
            ) || goldenPath[Math.min(i, goldenPath.length - 1)];
            
            return (
              <div key={i} className="relative">
                {/* Vertical Connector Line with dynamic color and animation */}
                {i < userPath.length - 1 && (
                  <div className="absolute left-[31px] top-16 bottom-0 flex justify-center w-1">
                    <div className={`h-full w-1 transition-colors duration-1000 ${
                      isAligned && nextIsAligned 
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                        : 'bg-transparent border-l-[3px] border-dashed border-rose-500/60'
                    }`}></div>
                    {(!isAligned || !nextIsAligned) && (
                      <motion.div 
                        animate={{ y: [0, 100, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-b from-transparent via-rose-500 to-transparent h-20 w-1"
                      />
                    )}
                  </div>
                )}

                {/* Missing Link Indicator between nodes */}
                {i < userPath.length - 1 && (!isAligned || !nextIsAligned) && (
                  <div className="absolute left-[14px] top-[100px] z-20">
                    <div className="bg-rose-900/90 border border-rose-500 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                      <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Broken Link</span>
                    </div>
                  </div>
                )}

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-12 pb-20 last:pb-0 group/node"
                >
                  {/* Node Icon */}
                  <div className={`relative z-10 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 transition-all duration-700 shrink-0 group-hover/node:scale-110 ${
                    isAligned 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.1)]' 
                      : 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_40px_rgba(244,63,94,0.1)]'
                  }`}>
                    {isAligned ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-rose-400 animate-pulse" />
                    )}
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 text-[11px] font-black shadow-lg">
                      {i + 1}
                    </div>
                  </div>

                  {/* Step Card */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className={`lg:col-span-7 p-10 rounded-[3rem] border transition-all duration-500 relative overflow-visible ${
                      isAligned 
                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' 
                        : 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                    }`}>
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none ${
                        isAligned ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                      }`}></div>
                      
                      <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center">
                          <h4 className={`text-xl font-black tracking-tight ${isAligned ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stepObj.step}
                          </h4>
                          {/* Interactive Tooltip for Staff Rationale */}
                          <div className="relative group/tooltip inline-block ml-3">
                            <div className={`p-1.5 rounded-full cursor-help transition-colors ${
                              isAligned ? 'bg-emerald-500/20 hover:bg-emerald-500/40' : 'bg-rose-500/20 hover:bg-rose-500/40'
                            }`}>
                              <Lightbulb className={`w-4 h-4 ${isAligned ? 'text-emerald-400' : 'text-rose-400'}`} />
                            </div>
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-5 bg-slate-800 text-white text-sm rounded-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-2xl border ${
                              isAligned ? 'border-emerald-500/30' : 'border-rose-500/30'
                            }`}>
                              <div className="flex items-center space-x-2 mb-2">
                                <Lightbulb className={`w-4 h-4 ${isAligned ? 'text-emerald-400' : 'text-rose-400'}`} />
                                <span className={`font-black text-[10px] uppercase tracking-widest ${isAligned ? 'text-emerald-400' : 'text-rose-400'}`}>Staff Rationale</span>
                              </div>
                              <p className="text-slate-300 leading-relaxed text-[13px] font-medium">{matchingGoldenStep.why}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </div>
                        {!isAligned && (
                          <div className="flex items-center space-x-2 bg-rose-500/20 px-4 py-1.5 rounded-full border border-rose-500/30 shadow-lg">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Critical Gap</span>
                          </div>
                        )}
                      </div>
                      
                      {!isAligned && (
                        <div className="mt-6 bg-rose-500/10 p-5 rounded-2xl border border-rose-500/20 relative z-10">
                          <div className="flex items-center space-x-2 mb-2">
                            <ArrowRight className="w-4 h-4 text-rose-400" />
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Staff Pivot</span>
                          </div>
                          <p className="text-[14px] text-slate-200 font-medium leading-relaxed">
                            {stepObj.staffPivot || "Realign with Staff Logic."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Analysis Column */}
                    <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                      {!isAligned ? (
                        <div className="space-y-6">
                          <div className="bg-rose-500/10 p-8 rounded-[2.5rem] border border-rose-500/20 shadow-xl hover:bg-rose-500/20 transition-all group/missing">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div>
                              <p className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em]">The Missing Link</p>
                            </div>
                            <p className="text-[14px] text-slate-200 font-bold leading-relaxed">
                              {matchingGoldenStep.strategicTradeOffs || "Skipping this step makes your strategy reactive rather than proactive. You missed the opportunity to define the competitive moat."}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3 text-rose-400/60 px-6">
                            <ArrowRight className="w-4 h-4 animate-bounce-x" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Logic Jump Detected</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/10 p-8 rounded-[2.5rem] border border-emerald-500/20 shadow-xl hover:bg-emerald-500/20 transition-all">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                              <TrendingUp className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em]">Strategic Alignment</span>
                          </div>
                          <p className="text-[14px] text-slate-200 font-bold leading-relaxed italic">
                            "Strong signal. You correctly identified the {matchingGoldenStep.title.toLowerCase()} phase, which is a key differentiator for Staff-level candidates."
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 pt-10 border-t border-white/5">
        <div className="bg-gradient-to-r from-indigo-500/10 to-transparent p-8 rounded-[2.5rem] border border-indigo-500/20 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Target className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-white uppercase tracking-widest">The Staff Secret</p>
            <p className="text-[13px] text-slate-400 font-medium leading-relaxed">
              Staff PMs spend 40% of their time on the first 2 steps of the Golden Path. 
              If you jump to "Features" before "Goal Definition", you've already lost the room.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RedlineView: React.FC<{ result: InterviewResult }> = ({ result }) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [expandedWhyUids, setExpandedWhyUids] = useState<Set<string>>(new Set());
  const annotationRefs = React.useRef<Map<string, HTMLSpanElement>>(new Map());

  const toggleWhy = (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWhyUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const annotatedVision = useMemo(() => 
    result.annotatedVision.map((a, i) => ({ ...a, uid: `v-${i}` })), 
    [result.annotatedVision]
  );

  const annotatedDefense = useMemo(() => 
    result.annotatedDefense.map((a, i) => ({ ...a, uid: `d-${i}` })), 
    [result.annotatedDefense]
  );

  const allAnnotations = useMemo(() => {
    return [...annotatedVision, ...annotatedDefense];
  }, [annotatedVision, annotatedDefense]);

  const selectedAnnotation = useMemo(() => 
    allAnnotations.find(a => a.uid === selectedUid) || null,
    [allAnnotations, selectedUid]
  );

  const handleSelectAnnotation = (uid: string) => {
    if (selectedUid === uid) {
      setSelectedUid(null);
      return;
    }
    setSelectedUid(uid);
    // Delay slightly to allow any layout shifts
    requestAnimationFrame(() => {
      const element = annotationRefs.current.get(uid);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  const weaknesses = useMemo(() => {
    const typesToShow = result.overallScore < 75 ? ['weakness', 'qualifier'] : ['weakness'];
    return allAnnotations.filter(a => typesToShow.includes(a.type));
  }, [allAnnotations, result.overallScore]);

  const renderFeedbackPanel = (annotation: TranscriptAnnotation) => {
    const feedback = annotation.feedback || '';
    const rewriteMatch = feedback.match(/REWRITE:(.*?)(?=ACTION:|$)/s);
    const actionMatch = feedback.match(/ACTION:(.*?)$/s);
    
    const critiqueText = feedback.split(/REWRITE:|ACTION:/)[0].trim();
    const rewriteText = rewriteMatch ? rewriteMatch[1].trim() : null;
    const actionText = actionMatch ? actionMatch[1].trim() : null;

    return (
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-right-4 sticky top-10 border border-indigo-500/20">
        <div className="flex items-center justify-between mb-6">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
            annotation.type === 'strength' ? 'bg-emerald-500/20 text-emerald-400' : 
            annotation.type === 'weakness' ? 'bg-rose-500/20 text-rose-400' : 
            'bg-amber-500/20 text-amber-400'
          }`}>
            {annotation.type} Audit
          </span>
          <button onClick={() => setSelectedUid(null)} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">The Critique</span>
            <p className="text-sm font-medium leading-relaxed text-slate-200">"{annotation.text}"</p>
            <p className="mt-3 text-[13px] text-slate-400 leading-relaxed">{critiqueText}</p>
          </div>

          {rewriteText && (
            <div className="pt-6 border-t border-white/10">
              <span className="block text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Staff-Level Alternative</span>
              <p className="italic text-slate-300 text-[13px] leading-relaxed">"{rewriteText}"</p>
            </div>
          )}

          {actionText && (
            <div className="pt-6 border-t border-white/10">
              <span className="block text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">Concrete Action</span>
              <p className="text-slate-200 font-bold text-[13px] leading-snug">{actionText}</p>
            </div>
          )}

          {annotation.whyItMatters && (
            <div className="pt-6 border-t border-white/10">
              <button 
                onClick={(e) => toggleWhy(annotation.uid as string, e)}
                className="flex items-center justify-between w-full group"
              >
                <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Strategic Context</span>
                <div className="text-indigo-400/50 group-hover:text-indigo-400 transition-colors">
                  {expandedWhyUids.has(annotation.uid as string) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>
              <motion.div
                initial={false}
                animate={{ height: expandedWhyUids.has(annotation.uid as string) ? 'auto' : '2.5rem' }}
                className="overflow-hidden"
              >
                <p className={`text-slate-400 italic text-[12px] leading-relaxed ${expandedWhyUids.has(annotation.uid as string) ? '' : 'line-clamp-2'}`}>
                  {annotation.whyItMatters}
                </p>
              </motion.div>
              {!expandedWhyUids.has(annotation.uid as string) && (
                <button 
                  onClick={(e) => toggleWhy(annotation.uid as string, e)}
                  className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-widest mt-1 hover:text-indigo-400 transition-colors"
                >
                  Read More
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Transcript Side */}
      <div className="lg:col-span-7 bg-[#FDFDFB] p-10 lg:p-14 rounded-[3.5rem] border border-slate-200 shadow-2xl space-y-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500/20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-10 pointer-events-none"></div>
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-8 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-6 bg-slate-900 rounded-full"></div>
              <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">The Redline Transcript</h4>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Click segments to reveal Staff-level audits</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="bg-rose-500/10 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20 shadow-sm">
              {weaknesses.length} Critical Gaps
            </span>
          </div>
        </div>

        <div className="space-y-12 max-h-[850px] overflow-y-auto pr-6 no-scrollbar scroll-smooth relative z-10">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Initial Response</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="text-[15px] leading-[1.8] font-medium text-slate-800 font-serif">
              {annotatedVision.map((a) => (
                <AnnotationSpan 
                  key={a.uid} 
                  ref={(el) => {
                    if (el) annotationRefs.current.set(a.uid, el);
                  }}
                  annotation={a} 
                  isActive={selectedUid === a.uid} 
                  onClick={() => handleSelectAnnotation(a.uid)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6 pt-10 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Defensive Response</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="text-[15px] leading-[1.8] font-medium text-slate-800 font-serif">
              {annotatedDefense.map((a) => (
                <AnnotationSpan 
                  key={a.uid} 
                  ref={(el) => {
                    if (el) annotationRefs.current.set(a.uid, el);
                  }}
                  annotation={a} 
                  isActive={selectedUid === a.uid} 
                  onClick={() => handleSelectAnnotation(a.uid)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Panel / Weakness Cards Side */}
      <div className="lg:col-span-5">
        {selectedAnnotation ? (
          renderFeedbackPanel(selectedAnnotation)
        ) : (
          <div className="space-y-6">
            <div className="space-y-1 mb-8">
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Critical Weaknesses</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click segments in the transcript to explore</p>
            </div>

            <div className="space-y-4">
              {weaknesses.map((w, i) => (
                <div 
                  key={w.uid} 
                  onClick={() => handleSelectAnnotation(w.uid)}
                  className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden ${
                    selectedUid === w.uid 
                      ? 'bg-indigo-50 border-indigo-300 shadow-inner' 
                      : 'bg-white border-slate-100 hover:border-rose-300 hover:shadow-xl'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-rose-500/10 transition-colors"></div>
                  
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${w.type === 'weakness' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        w.type === 'weakness' ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {w.type === 'weakness' ? `Gap ${i+1}` : 'Nuance Gap'}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400 transition-colors" />
                  </div>
                  <p className="text-[13px] font-black text-slate-900 mb-3 leading-tight relative z-10">"{w.text}"</p>
                  <p className="text-[12px] text-slate-600 font-medium leading-relaxed line-clamp-2 mb-4 relative z-10">{w.feedback?.split('REWRITE:')[0]}</p>
                  
                  {w.whyItMatters && (
                    <div 
                      onClick={(e) => toggleWhy(w.uid, e)}
                      className="mt-4 pt-4 border-t border-slate-100 group/why relative z-10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-1 bg-indigo-50 rounded-md">
                            <Lightbulb className="w-3 h-3 text-indigo-500" />
                          </div>
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Strategic Context</span>
                        </div>
                        <div className="text-indigo-400/30 group-hover/why:text-indigo-400 transition-colors">
                          {expandedWhyUids.has(w.uid) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className={`text-[11px] text-slate-400 italic font-medium leading-relaxed transition-all ${expandedWhyUids.has(w.uid) ? '' : 'line-clamp-1'}`}>
                        {w.whyItMatters}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              
              {weaknesses.length === 0 && (
                <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 text-center">
                  <p className="text-emerald-700 font-black text-sm">No critical gaps identified. Excellent execution.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RUBRIC_STANDARDS: Record<string, { standard: string; examples: string[] }> = {
  'Vision': {
    standard: 'Staff PMs connect features to a 3-5 year north star. They don\'t just build for today; they build for the ecosystem.',
    examples: ['Connecting a feature to long-term platform defensibility', 'Identifying non-obvious second-order effects']
  },
  'Execution': {
    standard: 'Flawless prioritization based on ROI and strategic leverage. High score requires identifying the "critical path" and potential bottlenecks.',
    examples: ['Using a weighted scoring model for feature selection', 'Defining clear MVP boundaries that still deliver value']
  },
  'Analytical Thinking': {
    standard: 'Data-driven decision making that goes beyond surface-level metrics. Staff PMs identify the "why" behind the numbers.',
    examples: ['Segmenting users to find non-obvious pain points', 'Predicting metric trade-offs (e.g., Engagement vs. Retention)']
  },
  'Communication': {
    standard: 'Crisp, structured, and persuasive. Staff PMs use frameworks not as a crutch, but as a way to drive consensus.',
    examples: ['Using the "Rule of Three" for key points', 'Summarizing complex trade-offs into simple executive decisions']
  },
  'Defense': {
    standard: 'Resilience under pressure. Staff PMs can defend their logic against aggressive counter-arguments without becoming defensive.',
    examples: ['Acknowledging a valid counter-point while explaining the strategic choice', 'Pivoting logic gracefully when new data is introduced']
  },
  'Product Sense': {
    standard: 'Deep empathy for user pain points combined with a keen eye for product-market fit. Staff PMs build what users need, not just what they ask for.',
    examples: ['Identifying "unmet needs" through behavioral observation', 'Designing for the "magic moment" in the user journey']
  }
};

const RubricDetailModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  category: string; 
  score: number; 
  reasoning: string;
  standard?: { standard: string; examples: string[] };
}> = ({ isOpen, onClose, category, score, reasoning, standard }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden relative z-10 border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            {/* Decorative Background Element */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
            
            <button 
              onClick={onClose}
              className="absolute top-10 right-10 p-3 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all z-20"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-12 lg:p-16 max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-center gap-8 mb-12">
                <div className="relative shrink-0">
                  <div className="flex flex-col items-center justify-center w-28 h-28 rounded-[2.5rem] bg-slate-900 text-white shadow-xl relative z-10">
                     <span className={`text-4xl font-black ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{score}</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Score</span>
                  </div>
                  <div className="absolute -inset-2 bg-indigo-500/20 rounded-[3rem] blur-xl -z-10"></div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{category} Audit</span>
                    </div>
                    {score >= 80 && (
                      <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Staff Level</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Mastery Analysis</h2>
                </div>
              </div>

              <div className="space-y-10">
                <section className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Your Performance</h4>
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 relative group">
                    <p className="text-lg text-slate-700 font-bold leading-relaxed italic">
                      "{reasoning}"
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="bg-indigo-600 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="flex items-center space-x-3 mb-6 relative z-10">
                      <Award className="w-6 h-6 text-indigo-200" />
                      <h4 className="text-[11px] font-black text-indigo-200 uppercase tracking-[0.3em]">The Staff Standard</h4>
                    </div>
                    <p className="text-[15px] text-white font-medium leading-relaxed relative z-10">
                      {standard?.standard || "Staff PMs demonstrate exceptional depth in this area, balancing immediate execution with long-term strategic impact."}
                    </p>
                  </section>

                  <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center space-x-3 mb-6">
                      <Info className="w-6 h-6 text-indigo-500" />
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">High Score Examples</h4>
                    </div>
                    <ul className="space-y-4 flex-1">
                      {(standard?.examples || ['Clear prioritization logic', 'Identification of key trade-offs']).map((ex, idx) => (
                        <li key={idx} className="flex items-start space-x-4 group/item">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 group-hover/item:scale-125 transition-transform"></div>
                          <span className="text-[13px] text-slate-600 font-bold leading-tight group-hover/item:text-slate-900 transition-colors">{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const FeedbackView: React.FC<FeedbackViewProps> = ({ result, onReset, onPracticeDelta, isProductSense }) => {
  const [showBenchmarkScript, setShowBenchmarkScript] = useState(false);
  const [expandedRubric, setExpandedRubric] = useState<number | null>(null);
  const [selectedRubricIndex, setSelectedRubricIndex] = useState<number | null>(null);
  const lastValidRubricIndex = React.useRef<number | null>(null);

  if (selectedRubricIndex !== null) {
    lastValidRubricIndex.current = selectedRubricIndex;
  }

  const activeRubricIndex = selectedRubricIndex !== null ? selectedRubricIndex : lastValidRubricIndex.current;

  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

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
      <div className="bg-slate-900 rounded-[4rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.1),transparent)] pointer-events-none"></div>
        
        <div className="p-10 lg:p-14 relative z-10">
          {/* Top Row: Title, Main Score, and Skill Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-center">
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Executive Audit Result</span>
              </div>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none">Strategic Mastery</h2>
            </div>
            
            <div className="lg:col-span-3 flex items-center gap-6 bg-white/5 p-4 rounded-[2.5rem] border border-white/10 h-full">
              <div className="px-6 py-4 bg-indigo-600 rounded-[2rem] shadow-xl border border-indigo-500/30 flex flex-col items-center justify-center flex-1">
                <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-1">Rating</span>
                <span className="text-3xl font-black">{result.overallScore}</span>
              </div>
              <div className="pr-4 flex flex-col justify-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Stability</span>
                <span className={`text-xl font-black ${result.defensivePivotScore >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.defensivePivotScore}%
                </span>
              </div>
            </div>

            {/* Radar Chart moved to top row */}
            <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-4 flex flex-col items-center justify-center relative hover:bg-white/[0.07] transition-all h-full">
              <div className="absolute top-4 left-6">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Skill Balance</span>
              </div>
              <div className="w-full h-32 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={commData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 7, fontWeight: 800 }} />
                    <Radar name="Performance" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row: Two Evenly Sized Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Column 1: Framework Gap (The Delta) */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col space-y-6 hover:bg-white/[0.07] transition-all group/gap">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl group-hover/gap:bg-indigo-500/30 transition-colors">
                    <Target className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">The Framework Gap</span>
                </div>
                <div className="px-3 py-1 bg-rose-500/10 rounded-full border border-rose-500/20">
                  <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Logic Delta</span>
                </div>
              </div>

              {/* Actionable Summary at the Top */}
              <div className="bg-indigo-500/10 p-6 rounded-[2rem] border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-3">Core Strategic Gap</span>
                <p className="text-[13px] text-slate-200 font-bold leading-relaxed relative z-10">
                  {result.weaknesses?.[0] || result.defensivePivotAnalysis || "Your logic bypasses critical ecosystem anchoring, jumping directly to execution. To reach Staff level, you must first define the defensive moat and revenue goals before diving into platform constraints."}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 no-scrollbar space-y-4">
                <div className="relative pl-8 space-y-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-800"></div>
                  
                  {Array.isArray(result.userLogicPath) ? result.userLogicPath.map((stepObj, i) => {
                    const isExpanded = expandedStepIndex === i;
                    const isAligned = stepObj.isAligned;
                    // Try to find a matching golden step for the "Staff Pivot"
                    const matchingGoldenStep = result.goldenPath.find(gs => 
                      gs.title.toLowerCase().split(' ').some(kw => kw.length > 4 && stepObj.step.toLowerCase().includes(kw))
                    ) || result.goldenPath[Math.min(i, result.goldenPath.length - 1)];

                    return (
                      <div key={i} className="relative group/step">
                        <div className={`absolute -left-[29px] top-1.5 w-3 h-3 rounded-full border-2 transition-all z-10 ${
                          isExpanded 
                            ? 'bg-indigo-500 border-indigo-500/30 scale-125 shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                            : isAligned 
                              ? 'bg-emerald-500 border-emerald-900' 
                              : 'bg-slate-800 border-slate-900 group-hover/step:bg-rose-500 group-hover/step:border-rose-500/30'
                        }`}></div>
                        
                        <div className="space-y-3">
                          <button 
                            onClick={() => setExpandedStepIndex(isExpanded ? null : i)}
                            className="w-full text-left space-y-2 group/btn"
                          >
                            <p className={`text-[12px] font-bold leading-tight transition-colors ${
                              isExpanded 
                                ? 'text-indigo-300' 
                                : isAligned 
                                  ? 'text-slate-300' 
                                  : 'text-slate-500 line-through decoration-rose-500/40 group-hover/btn:text-slate-400'
                            }`}>
                              {stepObj.step}
                            </p>
                            {!isAligned && (
                              <div className={`flex items-center justify-between bg-indigo-500/5 p-2 px-3 rounded-xl border transition-all ${
                                isExpanded ? 'bg-indigo-500/20 border-indigo-500/30' : 'border-indigo-500/10 group-hover/btn:bg-indigo-500/10'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <ArrowRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90 text-indigo-400' : 'text-indigo-400'}`} />
                                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                                    {isExpanded ? 'Staff Correction' : 'Staff Pivot Required'}
                                  </span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-3 h-3 text-indigo-400" /> : <ChevronDown className="w-3 h-3 text-indigo-400" />}
                              </div>
                            )}
                            {isAligned && isExpanded && (
                              <div className="flex items-center justify-between bg-emerald-500/5 p-2 px-3 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center space-x-3">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    Aligned with Staff Path
                                  </span>
                                </div>
                                <ChevronUp className="w-3 h-3 text-emerald-400" />
                              </div>
                            )}
                            {isAligned && !isExpanded && (
                              <div className="flex items-center justify-between bg-emerald-500/5 p-2 px-3 rounded-xl border border-emerald-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity">
                                <div className="flex items-center space-x-3">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                    Aligned
                                  </span>
                                </div>
                                <ChevronDown className="w-3 h-3 text-emerald-500" />
                              </div>
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 mt-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-1 h-3 rounded-full ${isAligned ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isAligned ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                      {isAligned ? 'Staff Validation' : 'Staff Pivot'}
                                    </span>
                                  </div>
                                  <p className="text-[13px] text-white font-bold leading-relaxed">
                                    {isAligned ? matchingGoldenStep.title : (stepObj.staffPivot || matchingGoldenStep.title)}
                                  </p>
                                  <p className="text-[12px] text-slate-400 font-medium leading-relaxed italic">
                                    {matchingGoldenStep.why}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-slate-500 italic text-xs">No structured path detected.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Communication Profile */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-8 flex flex-col space-y-6 hover:bg-white/[0.07] transition-all group/comm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/20 rounded-xl group-hover/comm:bg-indigo-500/30 transition-colors">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Comm. Profile</span>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className={`p-6 rounded-[2rem] border relative overflow-hidden group/audit ${
                  result.communicationAnalysis?.overallAssessment === 'Strong' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  result.communicationAnalysis?.overallAssessment === 'Average' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                  <p className="text-[11px] font-black leading-relaxed relative z-10 uppercase tracking-[0.2em]">
                    {result.communicationAnalysis?.overallAssessment || 'Audit'}
                  </p>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 relative overflow-hidden">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Critical Audit Note</span>
                  <p className="text-[13px] text-slate-200 font-bold leading-relaxed relative z-10">
                    {result.communicationAnalysis?.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Detected Tone</span>
                    <span className="text-xs font-black text-white">{result.communicationAnalysis?.tone || 'Neutral'}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Staff Tip</span>
                    <span className="text-[10px] font-bold text-indigo-300">Drive opinionated narrative</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Clarity</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${result.communicationAnalysis?.clarityScore}%` }}></div>
                    </div>
                    <span className="text-[10px] font-black text-white">{result.communicationAnalysis?.clarityScore}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Confidence</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-white">{result.communicationAnalysis?.confidenceScore}%</span>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${result.communicationAnalysis?.confidenceScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RUBRIC BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {result.rubricScores?.map((r, i) => {
           const standard = RUBRIC_STANDARDS[r.category] || RUBRIC_STANDARDS[Object.keys(RUBRIC_STANDARDS).find(k => r.category.includes(k)) || ''];

           return (
             <div key={i}>
               <button 
                 onClick={() => setSelectedRubricIndex(i)}
                 className="w-full text-left bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all p-10 flex flex-col gap-8 group relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-slate-900 text-white shadow-xl shrink-0 group-hover:scale-110 transition-transform">
                       <span className={`text-xl font-black ${r.score >= 80 ? 'text-emerald-400' : r.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{r.score}</span>
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Score</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-full text-slate-300 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                     <h5 className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.2em]">{r.category}</h5>
                     <p className="text-[15px] text-slate-800 font-bold leading-relaxed line-clamp-4">{r.reasoning}</p>
                  </div>

                  <div className="pt-8 border-t border-slate-100 mt-auto relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-1.5 h-6 bg-slate-200 rounded-full"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Insight</span>
                    </div>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Audit Details</span>
                  </div>
               </button>
             </div>
           );
         })}
      </div>

      {/* RUBRIC DETAIL MODAL */}
      <RubricDetailModal 
        isOpen={selectedRubricIndex !== null}
        onClose={() => setSelectedRubricIndex(null)}
        category={activeRubricIndex !== null ? result.rubricScores[activeRubricIndex].category : ''}
        score={activeRubricIndex !== null ? result.rubricScores[activeRubricIndex].score : 0}
        reasoning={activeRubricIndex !== null ? result.rubricScores[activeRubricIndex].reasoning : ''}
        standard={activeRubricIndex !== null ? (RUBRIC_STANDARDS[result.rubricScores[activeRubricIndex].category] || RUBRIC_STANDARDS[Object.keys(RUBRIC_STANDARDS).find(k => result.rubricScores[activeRubricIndex].category.includes(k)) || '']) : undefined}
      />

      {/* REDLINE TRANSCRIPT */}
      <RedlineView result={result} />

      {/* LOGIC FLOWCHART */}
      <LogicFlowchart userPath={result.userLogicPath} goldenPath={result.goldenPath} />

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
      <div className="space-y-10">
        <div className="flex flex-col space-y-2">
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Growth Opportunities</h3>
          <p className="text-slate-400 font-bold text-sm">High-impact adjustments to bridge the gap to Staff level.</p>
        </div>
        
        <div className="flex flex-col space-y-12">
           {result.improvementItems?.map((item, i) => (
             <div key={i} className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm hover:border-indigo-400 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="space-y-12 relative z-10">
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] px-4 py-1.5 bg-indigo-50 rounded-full w-fit block border border-indigo-100">
                        {item.category}
                      </span>
                      <h5 className="text-4xl font-black text-slate-900 leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">
                        {item.action}
                      </h5>
                    </div>
                    
                    <div className="flex items-center gap-8 bg-slate-50 px-8 py-4 rounded-[2rem] border border-slate-100">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact</span>
                        <span className={`text-sm font-black ${item.impact === 'High' ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {item.impact}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-slate-200"></div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Effort</span>
                        <span className={`text-sm font-black ${item.effort === 'Low' ? 'text-emerald-500' : item.effort === 'Medium' ? 'text-amber-500' : 'text-rose-500'}`}>
                          {item.effort}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Strategic Rationale */}
                    <div className="lg:col-span-5 space-y-8">
                      <div className="space-y-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                          <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Strategic Rationale</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 relative">
                          <svg className="absolute top-4 left-4 w-8 h-8 text-slate-200" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 1.89543 14.9124 1 16.017 1H19.017C21.2261 1 23.017 2.79086 23.017 5V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1.017 21L1.017 18C1.017 16.8954 1.91243 16 3.017 16H6.017C6.56928 16 7.017 15.5523 7.017 15V9C7.017 8.44772 6.56928 8 6.017 8H3.017C1.91243 8 1.017 7.10457 1.017 6V3L1.017 3C1.017 1.89543 1.91243 1 3.017 1H6.017C8.22614 1 10.017 2.79086 10.017 5V15C10.017 18.3137 7.33071 21 4.017 21H1.017Z" /></svg>
                          <p className="text-sm text-slate-600 font-medium leading-relaxed italic relative z-10 pl-4">
                            {item.whyItMatters}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => onPracticeDelta(item)} 
                        className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.3em] hover:bg-black transition shadow-2xl active:scale-95 transform hover:-translate-y-1 flex items-center justify-center space-x-3"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <span>Practice This Phrase</span>
                      </button>
                    </div>

                    {/* Phrasing Guide */}
                    <div className="lg:col-span-7 bg-indigo-50/30 p-10 rounded-[3rem] border border-indigo-100 shadow-inner">
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Staff Phrasing Guide</p>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto pr-4 no-scrollbar">
                        <HowToRenderer text={item.howTo} />
                      </div>
                    </div>
                  </div>
                </div>
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