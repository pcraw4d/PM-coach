
import React, { useState, useEffect } from 'react';
import { Header, Container } from './components/Layout';
import { Recorder } from './components/Recorder';
import { FeedbackView } from './components/FeedbackView';
import { HistoryList } from './components/HistoryList';
import { AuthView } from './components/AuthView';
import { InterviewType, Question, InterviewPhase, InterviewResult, StoredInterview, User } from './types';
import { QUESTIONS } from './constants.tsx';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('auth');
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<StoredInterview[]>([]);

  // Check for active session on mount
  useEffect(() => {
    const activeUserId = localStorage.getItem('pm_coach_active_user_id');
    if (activeUserId) {
      const users = JSON.parse(localStorage.getItem('pm_coach_users') || '[]');
      const foundUser = users.find((u: any) => u.id === activeUserId);
      if (foundUser) {
        setUser({
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          avatarSeed: foundUser.avatarSeed
        });
        setPhase('config');
      }
    }
  }, []);

  // Load user-specific history when user changes
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`pm_history_${user.id}`);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      } else {
        setHistory([]);
      }
    }
  }, [user]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`pm_history_${user.id}`, JSON.stringify(history));
    }
  }, [history, user]);

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
    localStorage.setItem('pm_coach_active_user_id', authUser.id);
    setPhase('config');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pm_coach_active_user_id');
    setPhase('auth');
    setHistory([]);
    setResult(null);
  };

  const startInterview = (type: InterviewType) => {
    const typeQuestions = QUESTIONS.filter(q => q.type === type);
    const randomQuestion = typeQuestions[Math.floor(Math.random() * typeQuestions.length)];
    setSelectedType(type);
    setCurrentQuestion(randomQuestion);
    setPhase('question');
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleRecordingStop = async (blob: Blob) => {
    if (!currentQuestion || !selectedType || !user) return;
    
    setIsProcessing(true);
    setPhase('analyzing');
    
    try {
      const base64 = await blobToBase64(blob);
      const feedback = await geminiService.analyzeResponse(
        selectedType,
        currentQuestion.text,
        base64,
        'audio/webm'
      );
      
      const newEntry: StoredInterview = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        questionTitle: currentQuestion.text,
        type: selectedType,
        result: feedback
      };
      
      setHistory(prev => [newEntry, ...prev]);
      setResult(feedback);
      setPhase('result');
    } catch (err) {
      console.error("Analysis failed", err);
      alert("Something went wrong while analyzing your response. Please try again.");
      setPhase('question');
    } finally {
      setIsProcessing(false);
    }
  };

  const viewHistoryItem = (item: StoredInterview) => {
    setSelectedType(item.type);
    setResult(item.result);
    setPhase('result');
  };

  const clearHistory = () => {
    if (user) {
      setHistory([]);
      localStorage.removeItem(`pm_history_${user.id}`);
    }
  };

  const reset = () => {
    setPhase('config');
    setSelectedType(null);
    setCurrentQuestion(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user}
        onShowHistory={() => setPhase('history')} 
        onShowHome={() => setPhase(user ? 'config' : 'auth')} 
        onLogout={handleLogout}
      />
      <Container>
        {phase === 'auth' && (
          <AuthView onAuthSuccess={handleAuthSuccess} />
        )}

        {phase === 'config' && user && (
          <div className="text-center space-y-12 py-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 mb-2">
                 <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                   Dashboard
                 </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Master the <span className="text-indigo-600">PM</span> Interview
              </h1>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Great to see you, <span className="text-indigo-600 font-bold">{user.name.split(' ')[0]}</span>. 
                {history.length > 0 
                  ? ` You've completed ${history.length} sessions. Ready for another?` 
                  : " Let's start by choosing a core interview track below."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <button
                onClick={() => startInterview(InterviewType.PRODUCT_SENSE)}
                className="group relative bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-500 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Product Sense</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    Practice user-centric design & strategy. Focus on clarifying missions, identifying user pain points, and creative brainstorming.
                  </p>
                  <div className="flex items-center text-indigo-600 font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Begin Practice Session 
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </button>

              <button
                onClick={() => startInterview(InterviewType.ANALYTICAL_THINKING)}
                className="group relative bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-emerald-500 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Execution Thinking</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    Analyze metrics, root causes, and trade-offs. Master the structured framework required for troubleshooting and goal setting.
                  </p>
                  <div className="flex items-center text-emerald-600 font-bold text-xs uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    Begin Practice Session 
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {history.length > 0 && (
              <button 
                onClick={() => setPhase('history')}
                className="inline-flex items-center space-x-2 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-[11px] uppercase tracking-[0.2em]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Review {history.length} past achievements</span>
              </button>
            )}
          </div>
        )}

        {(phase === 'question' || phase === 'analyzing') && currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-12 py-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                Session Active
              </span>
              <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                {currentQuestion.text}
              </h2>
              {currentQuestion.hint && (
                <div className="bg-white border border-slate-100 p-5 rounded-2xl inline-block max-w-md shadow-sm">
                  <p className="text-sm text-slate-600 italic font-medium">
                    <span className="font-black text-indigo-600 not-italic uppercase tracking-widest text-[10px] mr-2">Pro-Tip:</span> {currentQuestion.hint}
                  </p>
                </div>
              )}
            </div>

            <Recorder onStop={handleRecordingStop} isProcessing={isProcessing} />
          </div>
        )}

        {phase === 'result' && result && (
          <FeedbackView 
            result={result} 
            onReset={reset} 
            isProductSense={selectedType === InterviewType.PRODUCT_SENSE} 
          />
        )}

        {phase === 'history' && (
          <HistoryList 
            history={history} 
            onSelect={viewHistoryItem} 
            onClear={clearHistory}
          />
        )}
      </Container>
      
      <footer className="mt-auto py-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">
          Gemini 3 Powered &bull; Personalized PM Coaching &bull; v2.0
        </div>
      </footer>
    </div>
  );
};

export default App;
