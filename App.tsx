import React, { useState, useEffect } from 'react';
import { Header, Container } from './components/Layout.tsx';
import { Recorder } from './components/Recorder.tsx';
import { FeedbackView } from './components/FeedbackView.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CustomQuestionInput } from './components/CustomQuestionInput.tsx';
import { AccessGate } from './components/AccessGate.tsx';
import { MissionFeed } from './components/MissionFeed.tsx';
import { InterviewType, Question, InterviewPhase, InterviewResult, HistoryItem, User, KnowledgeMission, StoredMission, StoredInterview } from './types.ts';
import { QUESTIONS } from './constants.tsx';
import { geminiService } from './services/geminiService.ts';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('config');
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dailyMissions, setDailyMissions] = useState<KnowledgeMission[]>([]);
  const [isMissionsLoading, setIsMissionsLoading] = useState(false);
  
  const [initialTranscript, setInitialTranscript] = useState<string>('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('pm_app_access_token')?.trim();
      if (!savedToken) {
        setIsAuthLoading(false);
        return;
      }

      const clean = (key: any): string => {
        if (!key || typeof key !== 'string') return '';
        return key.replace(/['"\r\n\t]/g, '').trim();
      };

      const env = (import.meta as any).env || {};
      const proc = typeof process !== 'undefined' ? process.env : {};

      const vKey = clean(env.VITE_ACCESS_KEY);
      const aKey = clean(env.ACCESS_KEY);
      const pVKey = clean(proc.VITE_ACCESS_KEY);
      const pAKey = clean(proc.ACCESS_KEY);

      const matchesEnv = 
        (vKey && savedToken === vKey) || 
        (aKey && savedToken === aKey) ||
        (pVKey && savedToken === pVKey) ||
        (pAKey && savedToken === pAKey);

      const isLocalTestKey = savedToken === 'pm-coach-local-test';

      if (matchesEnv || isLocalTestKey) {
        setIsAuthorized(true);
      } else {
        localStorage.removeItem('pm_app_access_token');
      }
      setIsAuthLoading(false);
    };
    checkAuth();
  }, []);

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

    const savedHistory = localStorage.getItem('pm_coach_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchMissions();
    }
  }, [isAuthorized]);

  const fetchMissions = async () => {
    setIsMissionsLoading(true);
    try {
      const missions = await geminiService.discoverMissions();
      setDailyMissions(missions);
    } catch (error) {
      console.error("Failed to fetch missions", error);
    } finally {
      setIsMissionsLoading(false);
    }
  };

  const handleStartInterview = (type: InterviewType) => {
    setSelectedType(type);
    const filteredQuestions = QUESTIONS.filter(q => q.type === type);
    const randomQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    setCurrentQuestion(randomQuestion);
    setPhase('question');
  };

  const handleStartCustom = () => {
    setPhase('custom-input');
  };

  const handleCustomQuestion = (text: string, type: InterviewType) => {
    setCurrentQuestion({
      id: `custom-${Date.now()}`,
      type,
      text,
      isCustom: true
    });
    setPhase('question');
  };

  const handleStopRecording = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true);
    setPhase('analyzing');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const { transcription, followUpQuestions } = await geminiService.generateFollowUps(
          currentQuestion.type,
          currentQuestion.text,
          base64Audio,
          blob.type
        );
        
        setInitialTranscript(transcription);
        setFollowUpQuestions(followUpQuestions);
        setPhase('grilling');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Something went wrong during analysis. Please try again.");
      setPhase('config');
      setIsProcessing(false);
    }
  };

  const handleStopFollowUp = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true);
    setPhase('analyzing');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const analysis = await geminiService.analyzeFullSession(
          currentQuestion.type,
          currentQuestion.text,
          initialTranscript,
          followUpQuestions,
          base64Audio,
          blob.type
        );
        
        setResult(analysis);
        
        const storedInterview: StoredInterview = {
          id: `interview-${Date.now()}`,
          activityType: 'INTERVIEW',
          timestamp: Date.now(),
          questionTitle: currentQuestion.text,
          type: currentQuestion.type,
          result: analysis
        };
        
        const newHistory = [storedInterview, ...history];
        setHistory(newHistory);
        localStorage.setItem('pm_coach_history', JSON.stringify(newHistory));
        
        setPhase('result');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error("Final analysis failed", error);
      alert("Something went wrong. Please try again.");
      setPhase('config');
      setIsProcessing(false);
    }
  };

  const handleCompleteMission = (id: string) => {
    const mission = dailyMissions.find(m => m.id === id);
    if (!mission || mission.isCompleted) return;

    setDailyMissions(prev => prev.map(m => m.id === id ? { ...m, isCompleted: true } : m));
    
    const storedMission: StoredMission = {
      id: `mission-log-${Date.now()}`,
      activityType: 'MISSION',
      timestamp: Date.now(),
      title: mission.title,
      missionType: mission.type,
      url: mission.url,
      source: mission.source,
      xpAwarded: mission.xpAwarded
    };

    const newHistory = [storedMission, ...history];
    setHistory(newHistory);
    localStorage.setItem('pm_coach_history', JSON.stringify(newHistory));
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('pm_coach_personal_user', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pm_coach_history');
  };

  const handleLogout = () => {
    localStorage.removeItem('pm_app_access_token');
    setIsAuthorized(false);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-indigo-500 font-black tracking-widest text-sm uppercase">Loading Secure Env...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <AccessGate onGrantAccess={() => setIsAuthorized(true)} />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header 
        user={user} 
        onShowHistory={() => setPhase('history')} 
        onShowHome={() => setPhase('config')} 
        onShowSettings={() => setPhase('settings')}
        onLogout={handleLogout}
      />

      <Container>
        {phase === 'config' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">
                  Ready to <span className="text-indigo-600">Scale</span>, {user.name.split(' ')[0]}?
                </h1>
                <p className="text-slate-500 font-medium text-lg">Pick a track and build your staff-level presence.</p>
              </div>
              <button 
                onClick={handleStartCustom}
                className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition shadow-sm"
              >
                Custom Case
              </button>
            </div>

            <MissionFeed 
              missions={dailyMissions} 
              onComplete={handleCompleteMission} 
              isLoading={isMissionsLoading}
              onRefresh={fetchMissions}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <button 
                onClick={() => handleStartInterview(InterviewType.PRODUCT_SENSE)}
                className="group relative bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-600 transition-all text-left overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                   <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                   </svg>
                </div>
                <div className="relative z-10">
                  <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Product Sense</h3>
                  <p className="text-slate-500 font-semibold leading-relaxed">Master the art of ambiguous design. Focus on user empathy, visionary thinking, and strategic moats.</p>
                  <div className="mt-8 flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Session <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => handleStartInterview(InterviewType.ANALYTICAL_THINKING)}
                className="group relative bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-emerald-600 transition-all text-left overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                   <svg className="w-24 h-24 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                   </svg>
                </div>
                <div className="relative z-10">
                  <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Analytical Thinking</h3>
                  <p className="text-slate-500 font-semibold leading-relaxed">Crush metrics and execution. Focus on root cause analysis, KPI definitions, and ruthless prioritization.</p>
                  <div className="mt-8 flex items-center text-emerald-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Session <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {phase === 'custom-input' && (
          <CustomQuestionInput 
            onStart={handleCustomQuestion} 
            onCancel={() => setPhase('config')} 
          />
        )}

        {phase === 'question' && currentQuestion && (
          <div className="max-w-3xl mx-auto py-12 text-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-4">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">
                Phase 1: The Brief
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                {currentQuestion.text}
              </h2>
              {currentQuestion.hint && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl max-w-xl mx-auto mt-6">
                   <p className="text-xs text-amber-800 font-bold leading-relaxed">
                     <span className="uppercase tracking-widest mr-2">Coach's Tip:</span> {currentQuestion.hint}
                   </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center space-y-6">
              <button 
                onClick={() => setPhase('recording')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-16 rounded-[2rem] shadow-2xl shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 text-xl uppercase tracking-widest"
              >
                Begin My Response
              </button>
              <button 
                onClick={() => setPhase('config')}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm transition"
              >
                Choose another question
              </button>
            </div>
          </div>
        )}

        {phase === 'recording' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-4">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">{currentQuestion?.text}</h3>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Speak clearly. We are recording for deep analysis.</p>
            </div>
            <Recorder 
              onStop={handleStopRecording} 
              onCancel={() => setPhase('config')} 
              isProcessing={isProcessing}
            />
          </div>
        )}

        {phase === 'grilling' && (
          <div className="max-w-3xl mx-auto py-12 text-center space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-6">
              <span className="bg-rose-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-rose-200">
                Phase 2: The Grill
              </span>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Excellent foundation. Now, defend your position:
              </h2>
              <div className="space-y-4 pt-4">
                {followUpQuestions.map((q, i) => (
                  <div key={i} className="p-6 bg-white border-2 border-slate-100 rounded-3xl shadow-sm">
                    <p className="text-lg font-bold text-slate-800 italic">"{q}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-6">
              <button 
                onClick={() => setPhase('recording-followup')}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black py-6 px-16 rounded-[2rem] shadow-2xl shadow-rose-200 transition-all transform hover:scale-105 active:scale-95 text-xl uppercase tracking-widest"
              >
                Defend My Logic
              </button>
            </div>
          </div>
        )}

        {phase === 'recording-followup' && (
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="text-center space-y-4">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">Defend Your Position</h3>
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Address the follow-up questions with conviction.</p>
            </div>
            <Recorder 
              onStop={handleStopFollowUp} 
              onCancel={() => setPhase('config')} 
              isProcessing={isProcessing}
            />
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-24 space-y-8">
            <div className="relative">
               <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <svg className="w-8 h-8 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               </div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gemini is Processing...</h3>
              <p className="text-slate-500 font-bold max-w-xs mx-auto animate-pulse">Running full-spectrum executive audit on your communication, logic, and strategic depth.</p>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <FeedbackView 
            result={result} 
            onReset={() => setPhase('config')} 
            isProductSense={currentQuestion?.type === InterviewType.PRODUCT_SENSE}
          />
        )}

        {phase === 'history' && (
          <HistoryList 
            history={history} 
            onSelect={(item) => {
              setResult(item.result);
              setCurrentQuestion({
                id: item.id,
                type: item.type,
                text: item.questionTitle
              });
              setPhase('result');
            }} 
            onClear={handleClearHistory}
          />
        )}

        {phase === 'settings' && (
          <SettingsView 
            user={user} 
            onUpdate={handleUpdateUser} 
            onDeleteAccount={() => {
              localStorage.clear();
              window.location.reload();
            }}
            onBack={() => setPhase('config')}
          />
        )}
      </Container>
    </div>
  );
};

export default App;