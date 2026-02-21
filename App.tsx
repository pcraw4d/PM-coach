import React, { useState, useEffect } from 'react';
import { Header, Container } from './components/Layout.tsx';
import { Recorder } from './components/Recorder.tsx';
import { FeedbackView } from './components/FeedbackView.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { CustomQuestionInput } from './components/CustomQuestionInput.tsx';
import { AccessGate } from './components/AccessGate.tsx';
import { MissionFeed } from './components/MissionFeed.tsx';
import { DashboardProgress } from './components/DashboardProgress.tsx';
import { InterviewType, Question, InterviewPhase, InterviewResult, HistoryItem, User, KnowledgeMission, StoredMission, StoredInterview } from './types.ts';
import { QUESTIONS } from './constants.tsx';
import { geminiService } from './services/geminiService.ts';

const MISSION_CACHE_KEY = 'pm_coach_missions_v1';
const MISSION_REVALIDATE_TTL = 60 * 60 * 1000; // 1 hour

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
  const [isRevalidating, setIsRevalidating] = useState(false);
  
  const [initialTranscript, setInitialTranscript] = useState<string>('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const savedToken = localStorage.getItem('pm_app_access_token')?.trim();
        if (!savedToken) {
          setIsAuthLoading(false);
          return;
        }
        const isLocalTestKey = savedToken === 'pm-coach-local-test';
        const vKey = (window.process?.env?.ACCESS_KEY || (import.meta as any).env?.ACCESS_KEY);
        if (isLocalTestKey || (vKey && savedToken === vKey)) {
          setIsAuthorized(true);
        } else {
          localStorage.removeItem('pm_app_access_token');
        }
      } catch (e) {
        setIsAuthLoading(false);
      } finally {
        setIsAuthLoading(false);
      }
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
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) loadMissions();
  }, [isAuthorized]);

  const loadMissions = async () => {
    const cached = localStorage.getItem(MISSION_CACHE_KEY);
    const now = Date.now();
    if (cached) {
      try {
        const { missions, timestamp } = JSON.parse(cached);
        setDailyMissions(missions);
        if (now - timestamp > MISSION_REVALIDATE_TTL) fetchMissions(false);
      } catch (e) {
        fetchMissions(true);
      }
    } else {
      fetchMissions(true);
    }
  };

  const fetchMissions = async (showLoading: boolean = true) => {
    if (showLoading) setIsMissionsLoading(true);
    else setIsRevalidating(true);
    try {
      const missions = await geminiService.discoverMissions();
      const merged = missions.map(m => {
        const existing = dailyMissions.find(dm => dm.id === m.id);
        return existing ? { ...m, isCompleted: existing.isCompleted } : m;
      });
      setDailyMissions(merged);
      localStorage.setItem(MISSION_CACHE_KEY, JSON.stringify({
        missions: merged,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsMissionsLoading(false);
      setIsRevalidating(false);
    }
  };

  const handleStartInterview = (type: InterviewType) => {
    setSelectedType(type);
    const filtered = QUESTIONS.filter(q => q.type === type);
    setCurrentQuestion(filtered[Math.floor(Math.random() * filtered.length)]);
    setPhase('question');
  };

  const handleStopRecording = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true); setPhase('analyzing');
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      const { transcription, followUpQuestions } = await geminiService.generateFollowUps(currentQuestion.type, currentQuestion.text, base64Audio, blob.type);
      setInitialTranscript(transcription); setFollowUpQuestions(followUpQuestions);
      setPhase('grilling'); setIsProcessing(false);
    };
  };

  const handleStopFollowUp = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true); setPhase('analyzing');
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      const analysis = await geminiService.analyzeFullSession(currentQuestion.type, currentQuestion.text, initialTranscript, followUpQuestions, base64Audio, blob.type);
      setResult(analysis);
      const stored: StoredInterview = { id: `int-${Date.now()}`, activityType: 'INTERVIEW', timestamp: Date.now(), questionTitle: currentQuestion.text, type: currentQuestion.type, result: analysis };
      const newHistory = [stored, ...history];
      setHistory(newHistory);
      localStorage.setItem('pm_coach_history', JSON.stringify(newHistory));
      setPhase('result'); setIsProcessing(false);
    };
  };

  const handleCompleteMission = (id: string) => {
    const mission = dailyMissions.find(m => m.id === id);
    if (!mission || mission.isCompleted) return;
    const updated = dailyMissions.map(m => m.id === id ? { ...m, isCompleted: true } : m);
    setDailyMissions(updated);
    localStorage.setItem(MISSION_CACHE_KEY, JSON.stringify({ missions: updated, timestamp: Date.now() }));
    const log: StoredMission = { id: `m-log-${Date.now()}`, activityType: 'MISSION', timestamp: Date.now(), title: mission.title, missionType: mission.type, url: mission.url, source: mission.source, xpAwarded: mission.xpAwarded };
    const newHistory = [log, ...history];
    setHistory(newHistory);
    localStorage.setItem('pm_coach_history', JSON.stringify(newHistory));
  };

  if (isAuthLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center animate-pulse text-indigo-500 font-black">Booting Vault...</div>;
  if (!isAuthorized) return <AccessGate onGrantAccess={() => setIsAuthorized(true)} />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header user={user} onShowHistory={() => setPhase('history')} onShowHome={() => setPhase('config')} onShowSettings={() => setPhase('settings')} onLogout={() => { localStorage.removeItem('pm_app_access_token'); setIsAuthorized(false); }} />
      <Container>
        {phase === 'config' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* XP PROGRESS BAR */}
            <DashboardProgress history={history} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">Scale up, <span className="text-indigo-600">Product.</span></h1>
                <p className="text-slate-500 font-medium text-lg">Pick a track and build your staff-level presence.</p>
              </div>
              <button 
                onClick={() => setPhase('custom-input')} 
                className="bg-white border-2 border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 hover:shadow-lg transition-all duration-300"
              >
                Custom Case
              </button>
            </div>

            <MissionFeed 
              missions={dailyMissions} 
              onComplete={handleCompleteMission} 
              isLoading={isMissionsLoading} 
              isRevalidating={isRevalidating} 
              onRefresh={() => fetchMissions(true)} 
            />

            {/* INTERVIEW PRACTICE SECTION */}
            <div className="space-y-8 pt-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Interview Battlegrounds</h3>
                <div className="h-[1px] w-full bg-slate-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PRODUCT SENSE CARD */}
                <button 
                  onClick={() => handleStartInterview(InterviewType.PRODUCT_SENSE)} 
                  className="group relative bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 hover:border-indigo-600 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-2 text-left"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 transform group-hover:rotate-6 shadow-sm">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="bg-slate-50 text-slate-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">Design Thinking</span>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Product Sense</h3>
                    <p className="text-slate-500 font-semibold leading-relaxed text-base">Master ambiguous design and empathy. Solve complex user needs with visionary products.</p>
                  </div>

                  <div className="mt-10 flex items-center">
                    <div className="flex items-center space-x-2 bg-indigo-600 px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-100 transform transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-700">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">Start Track</span>
                       <svg className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                       </svg>
                    </div>
                  </div>
                </button>

                {/* ANALYTICAL THINKING CARD */}
                <button 
                  onClick={() => handleStartInterview(InterviewType.ANALYTICAL_THINKING)} 
                  className="group relative bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 hover:border-emerald-600 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-2 text-left"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 transform group-hover:-rotate-6 shadow-sm">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="bg-slate-50 text-slate-400 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">Metrics & Goals</span>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Analytical Thinking</h3>
                    <p className="text-slate-500 font-semibold leading-relaxed text-base">Crush metrics and root cause analysis. Prioritize features using ruthless data-driven frameworks.</p>
                  </div>

                  <div className="mt-10 flex items-center">
                    <div className="flex items-center space-x-2 bg-emerald-600 px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-100 transform transition-all duration-300 group-hover:scale-105 group-hover:bg-emerald-700">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white">Start Track</span>
                       <svg className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                       </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        {phase === 'custom-input' && <CustomQuestionInput onStart={(txt, typ) => { setCurrentQuestion({ id: `c-${Date.now()}`, type: typ, text: txt, isCustom: true }); setPhase('question'); }} onCancel={() => setPhase('config')} />}
        {phase === 'question' && currentQuestion && (
          <div className="max-w-3xl mx-auto py-12 text-center space-y-12 animate-in fade-in zoom-in-95">
            <div className="space-y-4">
              <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Phase 1: The Brief</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">{currentQuestion.text}</h2>
            </div>
            <button onClick={() => setPhase('recording')} className="bg-indigo-600 text-white font-black py-6 px-16 rounded-[2rem] shadow-2xl transition transform hover:scale-105 uppercase tracking-widest text-xl">Begin My Response</button>
          </div>
        )}
        {phase === 'recording' && <Recorder onStop={handleStopRecording} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={currentQuestion?.text} />}
        {phase === 'grilling' && (
          <div className="max-w-3xl mx-auto py-12 text-center space-y-12 animate-in fade-in zoom-in-95">
            <span className="bg-rose-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Phase 2: The Grill</span>
            <div className="space-y-4">
              {followUpQuestions.map((q, i) => ( <div key={i} className="p-6 bg-white border-2 border-slate-100 rounded-3xl font-bold italic text-lg">"{q}"</div> ))}
            </div>
            <button onClick={() => setPhase('recording-followup')} className="bg-rose-600 text-white font-black py-6 px-16 rounded-[2rem] shadow-2xl transition transform hover:scale-105 uppercase tracking-widest text-xl">Defend My Logic</button>
          </div>
        )}
        {phase === 'recording-followup' && <Recorder onStop={handleStopFollowUp} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={followUpQuestions} />}
        {phase === 'analyzing' && <div className="flex flex-col items-center justify-center py-24 space-y-8"><div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div><h3 className="text-2xl font-black uppercase">Gemini is Auditing...</h3></div>}
        {phase === 'result' && result && <FeedbackView result={result} onReset={() => setPhase('config')} isProductSense={currentQuestion?.type === InterviewType.PRODUCT_SENSE} />}
        {phase === 'history' && <HistoryList history={history} onSelect={(item) => { setResult(item.result); setCurrentQuestion({ id: item.id, type: item.type, text: item.questionTitle }); setPhase('result'); }} onClear={() => { setHistory([]); localStorage.removeItem('pm_coach_history'); }} />}
        {phase === 'settings' && <SettingsView user={user} onUpdate={(upd) => { const u = { ...user, ...upd }; setUser(u); localStorage.setItem('pm_coach_personal_user', JSON.stringify(u)); }} onDeleteAccount={() => { localStorage.clear(); window.location.reload(); }} onBack={() => setPhase('config')} />}
      </Container>
    </div>
  );
};

export default App;