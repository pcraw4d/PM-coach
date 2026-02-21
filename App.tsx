
import React, { useState, useEffect, useMemo } from 'react';
import { Header, Container } from './components/Layout.tsx';
import { Recorder } from './components/Recorder.tsx';
import { FeedbackView } from './components/FeedbackView.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CustomQuestionInput } from './components/CustomQuestionInput.tsx';
import { AccessGate } from './components/AccessGate.tsx';
import { InterviewType, Question, InterviewPhase, InterviewResult, StoredInterview, User } from './types.ts';
import { QUESTIONS } from './constants.tsx';
import { geminiService } from './services/geminiService.ts';
import { syncService } from './services/syncService.ts';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('config');
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<StoredInterview[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Security & Authorization Check
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('pm_app_access_token');
      
      // Use direct literal references for bundler replacement
      const matchesEnv = 
        (savedToken && savedToken === (process.env as any).ACCESS_KEY) ||
        (savedToken && savedToken === (process.env as any).VITE_ACCESS_KEY) ||
        (savedToken && savedToken === (process.env as any).REACT_APP_ACCESS_KEY);
      
      if (matchesEnv) {
        setIsAuthorized(true);
      }
      
      setIsAuthLoading(false);
    };
    
    checkAuth();
  }, []);

  // Initialize single user
  useEffect(() => {
    if (!isAuthorized) return;

    const savedUser = localStorage.getItem('pm_coach_personal_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      const defaultUser: User = {
        id: 'me',
        name: 'Product Master',
        email: 'me@pmcoach.ai',
        avatarSeed: 'pm-visionary-' + Math.random().toString(36).substring(7),
        joinedAt: Date.now(),
        hasCompletedOnboarding: true
      };
      setUser(defaultUser);
      localStorage.setItem('pm_coach_personal_user', JSON.stringify(defaultUser));
    }

    const savedHistory = localStorage.getItem('pm_history_me');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [isAuthorized]);

  // Sync local changes to local storage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('pm_history_me', JSON.stringify(history));
    }
  }, [history]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('pm_coach_personal_user', JSON.stringify(user));
    }
  }, [user]);

  const stats = useMemo(() => {
    const totalXP = history.reduce((acc, item) => {
      let xp = 100 + (item.result.overallScore * 2);
      if (item.result.overallScore >= 85) xp += 50;
      return acc + xp;
    }, 0);
    const level = Math.floor(totalXP / 1000) + 1;
    const currentLevelXP = totalXP % 1000;
    const progress = (currentLevelXP / 1000) * 100;
    return { totalXP, level, progress, currentLevelXP };
  }, [history]);

  const handleCloudSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const synced = await syncService.sync({
        user,
        history,
        lastUpdated: Date.now()
      });
      setUser(synced.user);
      setHistory(synced.history);
      alert("Cloud Sync Successful!");
    } catch (err: any) {
      console.error(err);
      alert(`Sync Failed: ${err.message || 'Check your Google Cloud configuration'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const startInterview = (type: InterviewType) => {
    const typeQuestions = QUESTIONS.filter(q => q.type === type);
    const randomQuestion = typeQuestions[Math.floor(Math.random() * typeQuestions.length)];
    setSelectedType(type);
    setCurrentQuestion(randomQuestion);
    setPhase('question');
  };

  const startCustomInterview = (questionText: string, type: InterviewType) => {
    const customQuestion: Question = {
      id: `custom-${crypto.randomUUID()}`,
      type,
      text: questionText,
      isCustom: true
    };
    setSelectedType(type);
    setCurrentQuestion(customQuestion);
    setPhase('question');
  };

  const handleRecordingStop = async (blob: Blob) => {
    if (!currentQuestion || !selectedType || !user) return;
    setIsProcessing(true);
    setPhase('analyzing');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const feedback = await geminiService.analyzeResponse(selectedType, currentQuestion.text, base64, 'audio/webm');
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
      };
    } catch (err: any) {
      alert("Analysis failed: " + (err.message || "Unknown error"));
      setPhase('question');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setPhase('config');
    setSelectedType(null);
    setCurrentQuestion(null);
    setResult(null);
  };

  // 1. Loading state to prevent "Gate Flicker"
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Gatekeeper
  if (!isAuthorized) {
    return <AccessGate onGrantAccess={() => setIsAuthorized(true)} />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user}
        onShowHistory={() => setPhase('history')} 
        onShowHome={() => setPhase('config')} 
        onShowSettings={() => setPhase('settings')}
        onLogout={() => {}} 
      />
      
      <Container>
        {phase === 'settings' && (
          <SettingsView 
            user={user} 
            onUpdate={(u) => setUser({...user, ...u})} 
            onDeleteAccount={() => { localStorage.clear(); window.location.reload(); }}
            onBack={() => setPhase('config')}
          />
        )}
        
        {phase === 'config' && (
          <div className="space-y-12 animate-in fade-in zoom-in-95 duration-500">
            {/* Career Progress Dashboard */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-40"></div>
              
              <div className="relative z-10 w-32 h-32 rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-200 flex items-center justify-center transform -rotate-3 transition hover:rotate-0 duration-300">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.avatarSeed}`} 
                  alt="Avatar"
                  className="w-24 h-24"
                />
              </div>

              <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Level {stats.level} Product Leader</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">{stats.totalXP.toLocaleString()} Total XP Earned</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Progress to Level {stats.level + 1}</span>
                    <span>{Math.round(stats.currentLevelXP)} / 1000 XP</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative p-1">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-1000 progress-bar-glow" 
                      style={{ width: `${stats.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 md:pl-8 md:border-l border-slate-100">
                <button 
                  onClick={handleCloudSync}
                  disabled={isSyncing}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all group ${
                    isSyncing ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-lg'
                  }`}
                >
                  <svg className={`w-8 h-8 mb-2 ${isSyncing ? 'animate-spin text-slate-400' : 'text-indigo-600 group-hover:scale-110 transition-transform'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                    {isSyncing ? 'Syncing...' : 'Manual Sync'}
                  </span>
                </button>
              </div>
            </div>

            <div className="text-center space-y-4">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Daily Missions</h3>
               <p className="text-slate-500 font-medium">Choose a focus area to sharpen your PM instincts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
              <button onClick={() => startInterview(InterviewType.PRODUCT_SENSE)} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 transition-all hover:shadow-2xl hover:-translate-y-2 text-left relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-8xl opacity-5 group-hover:opacity-10 transition-opacity">💡</div>
                <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-2 text-slate-900">Product Sense</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Design thinking, user personas, and visionary roadmapping sessions.</p>
              </button>

              <button onClick={() => startInterview(InterviewType.ANALYTICAL_THINKING)} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-emerald-500 transition-all hover:shadow-2xl hover:-translate-y-2 text-left relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-8xl opacity-5 group-hover:opacity-10 transition-opacity">📊</div>
                <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-2 text-slate-900">Execution</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Metrics, root cause analysis, and data-driven prioritization missions.</p>
              </button>

              <button onClick={() => setPhase('custom-input')} className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-amber-500 transition-all hover:shadow-2xl hover:-translate-y-2 text-left relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-8xl opacity-5 group-hover:opacity-10 transition-opacity">🖋️</div>
                <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black mb-2 text-slate-900">Custom Quest</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Enter your own interview prompt or specific case study to practice.</p>
              </button>
            </div>
          </div>
        )}

        {phase === 'custom-input' && <CustomQuestionInput onStart={startCustomInterview} onCancel={() => setPhase('config')} />}

        {(phase === 'question' || phase === 'analyzing') && currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-12 py-10">
            <h2 className="text-3xl font-black text-center text-slate-900">{currentQuestion.text}</h2>
            <Recorder onStop={handleRecordingStop} onCancel={() => setPhase('config')} isProcessing={isProcessing} />
          </div>
        )}

        {phase === 'result' && result && <FeedbackView result={result} onReset={reset} isProductSense={selectedType === InterviewType.PRODUCT_SENSE} />}
        {phase === 'history' && <HistoryList history={history} onSelect={(i) => {setResult(i.result); setPhase('result')}} onClear={() => {setHistory([]); localStorage.removeItem('pm_history_me'); }} />}
      </Container>
    </div>
  );
};

export default App;
