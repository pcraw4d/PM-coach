import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Lock, Clock, CheckCircle2 } from 'lucide-react';
import { Question, InterviewType } from '../types';

interface QuestionBrowserProps {
  questions: Question[];
  onSelect: (question: Question) => void;
  onCancel: () => void;
  initialType?: InterviewType;
}

export const QuestionBrowser: React.FC<QuestionBrowserProps> = ({ 
  questions, 
  onSelect, 
  onCancel,
  initialType 
}) => {
  const [activeTab, setActiveTab] = useState<InterviewType>(initialType || InterviewType.PRODUCT_SENSE);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const filteredQuestions = questions.filter(q => q.type === activeTab);
  
  // Group by category (or 'General' if missing)
  const groupedQuestions = filteredQuestions.reduce((acc, q) => {
    const cat = q.category || 'General Practice';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Auto-expand the first category if none are expanded
  React.useEffect(() => {
    if (Object.keys(expandedCategories).length === 0 && Object.keys(groupedQuestions).length > 0) {
      setExpandedCategories({ [Object.keys(groupedQuestions)[0]]: true });
    }
  }, [groupedQuestions]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Browse Questions</h2>
          <p className="text-slate-500 font-medium mt-1">Select a specific challenge to master.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab(InterviewType.PRODUCT_SENSE)}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === InterviewType.PRODUCT_SENSE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Product Sense
          </button>
          <button 
            onClick={() => setActiveTab(InterviewType.ANALYTICAL_THINKING)}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === InterviewType.ANALYTICAL_THINKING ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Analytical
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedQuestions).map(([category, qs]) => (
          <div key={category} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md">
            <button 
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-2 h-8 rounded-full ${activeTab === InterviewType.PRODUCT_SENSE ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{category}</h3>
                <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-black">{qs.length}</span>
              </div>
              {expandedCategories[category] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {expandedCategories[category] && (
              <div className="px-6 pb-6 space-y-3 border-t border-slate-50 pt-4">
                {qs.map((q) => (
                  <div 
                    key={q.id} 
                    className="group relative bg-slate-50/50 border border-slate-100 rounded-2xl p-5 hover:bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer"
                    onClick={() => onSelect(q)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {q.isCustom && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Custom
                            </span>
                          )}
                          {!q.isApproved && q.isCustom && (
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Pending Approval
                            </span>
                          )}
                          {q.isApproved && (
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 font-bold leading-relaxed">{q.text}</p>
                        {q.hint && (
                          <p className="text-slate-400 text-xs mt-2 font-medium italic">Hint: {q.hint}</p>
                        )}
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ${activeTab === InterviewType.PRODUCT_SENSE ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groupedQuestions).length === 0 && (
          <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-black text-slate-800">No questions found</h3>
            <p className="text-slate-500 font-medium">Try switching categories or adding a custom question.</p>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onCancel}
          className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-colors active:scale-95"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
