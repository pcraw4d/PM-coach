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
import { InterviewType, Question, InterviewPhase, InterviewResult, HistoryItem, User, KnowledgeMission, ImprovementItem } from './types.ts';
import { QUESTIONS } from './constants.tsx';
import { geminiService } from './services/geminiService.ts';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('config');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMissionsLoading, setIsMissionsLoading] = useState(false);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dailyMissions, setDailyMissions] = useState<KnowledgeMission[]>([]);
  const [initialTranscript, setInitialTranscript] = useState<string>('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [targetDelta, setTargetDelta] = useState<ImprovementItem | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<{ success: boolean; feedback: string } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('pm_app_access_token');
    if (savedToken) setIsAuthorized(true);
    setIsAuthLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const savedUser = localStorage.getItem('pm_coach_personal_user');
    setUser(savedUser ? JSON.parse(savedUser) : { id: 'me', name: 'Product Master', avatarSeed: 'pm-'+Date.now(), joinedAt: Date.now() });
    
    const savedHistory = localStorage.getItem('pm_coach_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedMissions = localStorage.getItem('pm_coach_missions');
    if (savedMissions) {
        setDailyMissions(JSON.parse(savedMissions));
    } else {
        loadMissions();
    }
  }, [isAuthorized]);

  const loadMissions = async () => {
    setIsMissionsLoading(true);
    try {
      const m = await geminiService.discoverMissions();
      setDailyMissions(m);
      localStorage.setItem('pm_coach_missions', JSON.stringify(m));
    } finally {
      setIsMissionsLoading(false);
    }
  };

  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('pm_coach_history', JSON.stringify(newHistory));
  };

  const handleMissionComplete = (missionId: string) => {
    const mission = dailyMissions.find(m => m.id === missionId);
    if (!mission || mission.isCompleted) return;

    const updatedMissions = dailyMissions.map(m => 
      m.id === missionId ? { ...m, isCompleted: true } : m
    );
    setDailyMissions(updatedMissions);
    localStorage.setItem('pm_coach_missions', JSON.stringify(updatedMissions));

    const missionHistoryItem: HistoryItem = {
      id: `miss-${Date.now()}`,
      activityType: 'MISSION',
      timestamp: Date.now(),
      title: mission.title,
      xpAwarded: mission.xpAwarded
    };
    saveHistory([missionHistoryItem, ...history]);
  };

  const handleStartInterview = (type: InterviewType) => {
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
      const { transcription, followUpQuestions } = await geminiService.generateFollowUps(currentQuestion.type, currentQuestion.text, (reader.result as string).split(',')[1], blob.type);
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
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await geminiService.analyzeFullSession(currentQuestion.type, currentQuestion.text, initialTranscript, followUpQuestions, base64, blob.type);
      setResult(analysis);
      const newHistoryItem: HistoryItem = { id: `int-${Date.now()}`, activityType: 'INTERVIEW', timestamp: Date.now(), questionTitle: currentQuestion.text, type: currentQuestion.type, result: analysis };
      saveHistory([newHistoryItem, ...history]);
      setPhase('result'); setIsProcessing(false);
    };
  };

  const handlePracticeDelta = (item: ImprovementItem) => {
    setTargetDelta(item);
    setPracticeFeedback(null);
    setPhase('practice-delta');
  };

  const handleStopPracticeDelta = async (blob: Blob) => {
     if (!targetDelta) return;
     setIsProcessing(true);
     const reader = new FileReader();
     reader.readAsDataURL(blob);
     reader.onloadend = async () => {
       const base64 = (reader.result as string).split(',')[1];
       const feedback = await geminiService.verifyDeltaPractice(targetDelta, base64, blob.type);
       setPracticeFeedback(feedback);
       setIsProcessing(false);
     };
  };

  if (isAuthLoading) return null;
  if (!isAuthorized) return <AccessGate onGrantAccess={() => setIsAuthorized(true)} />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header user={user} onShowHistory={() => setPhase('history')} onShowHome={() => setPhase('config')} onShowSettings={() => setPhase('settings')} onLogout={() => setIsAuthorized(false)} />
      <Container>
        {phase === 'config' && (
          <div className="space-y-12">
            <DashboardProgress history={history} />
            <div className="flex justify-between items-end">
               <h1 className="text-5xl font-black tracking-tighter">Scale up, <span className="text-indigo-600">Product.</span></h1>
            </div>
            <MissionFeed 
              missions={dailyMissions} 
              isLoading={isMissionsLoading} 
              onRefresh={loadMissions} 
              onComplete={handleMissionComplete} 
            />
            
            <div className="space-y-6">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Interview Practice</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <button onClick={() => handleStartInterview(InterviewType.PRODUCT_SENSE)} className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 hover:border-indigo-600 transition shadow-sm text-left group">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">💡</div>
                     <h3 className="text-3xl font-black mb-2">Product Sense</h3>
                     <p className="text-slate-500 font-semibold">Master design thinking and visionary empathy.</p>
                  </button>
                  <button onClick={() => handleStartInterview(InterviewType.ANALYTICAL_THINKING)} className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 hover:border-emerald-600 transition shadow-sm text-left group">
                     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">📊</div>
                     <h3 className="text-3xl font-black mb-2">Analytical Thinking</h3>
                     <p className="text-slate-500 font-semibold">Crush metrics and root cause analysis.</p>
                  </button>
               </div>
            </div>
          </div>
        )}
        {phase === 'question' && currentQuestion && (
          <div className="text-center space-y-12 py-12">
            <h2 className="text-4xl font-black text-slate-900 leading-tight max-w-3xl mx-auto">{currentQuestion.text}</h2>
            <div className="flex justify-center gap-4">
               <button onClick={() => setPhase('recording')} className="bg-indigo-600 text-white font-black py-6 px-16 rounded-[2rem] text-xl shadow-xl hover:bg-indigo-700 transition active:scale-95">Begin My Response</button>
               <button onClick={() => setPhase('config')} className="bg-slate-100 text-slate-600 font-black py-6 px-10 rounded-[2rem] text-xl">Skip</button>
            </div>
          </div>
        )}
        {phase === 'recording' && <Recorder onStop={handleStopRecording} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={currentQuestion?.text} minDuration={120} />}
        {phase === 'grilling' && (
          <div className="text-center space-y-10 py-12 animate-in fade-in zoom-in-95">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">The Staff Audit Grill</h3>
               <h4 className="text-2xl font-black">Defend your logic against these follow-ups:</h4>
            </div>
            <div className="space-y-4 max-w-xl mx-auto">
              {followUpQuestions.map((q, i) => (
                <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl font-bold italic shadow-sm text-slate-800">
                  "{q}"
                </div>
              ))}
            </div>
            <button onClick={() => setPhase('recording-followup')} className="bg-rose-600 text-white font-black py-6 px-16 rounded-[2rem] text-xl shadow-xl hover:bg-rose-700 transition active:scale-95">Defend Logic</button>
          </div>
        )}
        {phase === 'recording-followup' && <Recorder onStop={handleStopFollowUp} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={followUpQuestions} minDuration={60} />}
        {phase === 'practice-delta' && targetDelta && (
           <div className="space-y-8 py-12 text-center animate-in fade-in zoom-in-95">
              {!practiceFeedback ? (
                <>
                  <h3 className="text-2xl font-black uppercase text-indigo-600">Focused Practice: {targetDelta.category}</h3>
                  <p className="text-xl font-bold max-w-2xl mx-auto">Try this: {targetDelta.action}</p>
                  <Recorder onStop={handleStopPracticeDelta} onCancel={() => setPhase('result')} isProcessing={isProcessing} minDuration={30} />
                </>
              ) : (
                <div className="max-w-xl mx-auto space-y-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl">
                   <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${practiceFeedback.success ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {practiceFeedback.success ? (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      )}
                   </div>
                   <h4 className="text-2xl font-black">{practiceFeedback.success ? "Delta Bridged!" : "Keep Polishing"}</h4>
                   <p className="text-slate-600 font-medium leading-relaxed italic">"{practiceFeedback.feedback}"</p>
                   <div className="flex gap-4">
                      <button onClick={() => setPracticeFeedback(null)} className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-2xl uppercase tracking-widest text-[10px]">Try Again</button>
                      <button onClick={() => setPhase('result')} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px]">Return to Audit</button>
                   </div>
                </div>
              )}
           </div>
        )}
        {phase === 'analyzing' && <div className="py-24 text-center text-2xl font-black animate-pulse">AUDITING PERFORMANCE...</div>}
        {phase === 'result' && result && <FeedbackView result={result} onReset={() => setPhase('config')} onPracticeDelta={handlePracticeDelta} isProductSense={currentQuestion?.type === InterviewType.PRODUCT_SENSE} />}
        {phase === 'history' && <HistoryList history={history} onSelect={(item) => { setResult(item.result); setPhase('result'); }} onClear={() => saveHistory([])} />}
        {phase === 'settings' && user && <SettingsView user={user} onUpdate={(u) => { setUser({...user, ...u}); localStorage.setItem('pm_coach_personal_user', JSON.stringify({...user, ...u})); }} onDeleteAccount={() => { localStorage.clear(); window.location.reload(); }} onBack={() => setPhase('config')} />}
      </Container>
    </div>
  );
};

export default App;