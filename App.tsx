import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
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

type LoadingStage = 'UPLOADING_AUDIO' | 'TRANSCRIBING' | 'GENERATING_FOLLOWUPS' | 'GENERATING_LOGIC' | 'FINALIZING_AUDIT' | 'SEARCHING_RESOURCES';

const App: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('config');
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('UPLOADING_AUDIO');
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
  const [apiError, setApiError] = useState<string | null>(null);
  const [missingKeyError, setMissingKeyError] = useState<boolean>(false);
  const [hasCheckpoint, setHasCheckpoint] = useState<boolean>(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('pm_app_access_token');
    if (savedToken) setIsAuthorized(true);
    setIsAuthLoading(false);

    if (!process.env.GEMINI_API_KEY) {
      setMissingKeyError(true);
    }
    
    // Check for incomplete sessions
    const checkpoint = sessionStorage.getItem('last_checkpoint_initial');
    const checkpointTime = sessionStorage.getItem('last_checkpoint_time');
    
    // Clear stale checkpoints (older than 4 hours)
    if (checkpointTime && (Date.now() - parseInt(checkpointTime)) > 14400000) {
      sessionStorage.clear();
      setHasCheckpoint(false);
    } else if (checkpoint) {
      setHasCheckpoint(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    const savedUser = localStorage.getItem('pm_coach_personal_user');
    setUser(savedUser ? JSON.parse(savedUser) : { id: 'me', name: 'Product Master', avatarSeed: 'pm-'+Date.now(), joinedAt: Date.now() });
    
    const savedHistory = localStorage.getItem('pm_coach_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedMissions = localStorage.getItem('pm_coach_missions');
    const lastMissionsUpdate = localStorage.getItem('pm_coach_missions_timestamp');
    const isCacheFresh = lastMissionsUpdate && (Date.now() - parseInt(lastMissionsUpdate)) < 86400000;

    if (savedMissions && isCacheFresh) {
        setDailyMissions(JSON.parse(savedMissions));
    } else {
        loadMissions();
    }
  }, [isAuthorized]);

  const loadMissions = async () => {
    setIsMissionsLoading(true);
    setLoadingStage('SEARCHING_RESOURCES');
    try {
      const m = await geminiService.discoverMissions();
      if (m && m.length > 0) {
        setDailyMissions(m);
        localStorage.setItem('pm_coach_missions', JSON.stringify(m));
        localStorage.setItem('pm_coach_missions_timestamp', Date.now().toString());
      }
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
    sessionStorage.clear();
    setHasCheckpoint(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestion) {
      const filtered = QUESTIONS.filter(q => q.type === currentQuestion.type);
      const remaining = filtered.filter(q => q.id !== currentQuestion.id);
      const nextQ = remaining.length > 0 
        ? remaining[Math.floor(Math.random() * remaining.length)] 
        : filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentQuestion(nextQ);
    }
  };

  const handleResumeAudit = async () => {
    const cachedInitial = sessionStorage.getItem('last_checkpoint_initial');
    const cachedFollowUp = sessionStorage.getItem('last_checkpoint_followup');
    const cachedQuestions = sessionStorage.getItem('last_checkpoint_questions');
    const cachedQTitle = sessionStorage.getItem('last_checkpoint_q_title');
    const cachedQType = sessionStorage.getItem('last_checkpoint_q_type');

    if (!cachedInitial || !cachedFollowUp || !cachedQuestions) {
      setApiError("Checkpoint data missing. Please record a new session.");
      sessionStorage.clear();
      setHasCheckpoint(false);
      return;
    }

    setIsProcessing(true);
    setPhase('analyzing');
    setLoadingStage('GENERATING_LOGIC');
    
    try {
      const questionsArray = JSON.parse(cachedQuestions);
      const qType = (cachedQType as InterviewType) || InterviewType.PRODUCT_SENSE;
      
      const analysis = await geminiService.analyzeFullSession(
        qType,
        cachedQTitle || "Interview Question",
        cachedInitial,
        questionsArray,
        cachedFollowUp
      );

      if (!analysis) throw new Error("Analysis failed");
      setLoadingStage('FINALIZING_AUDIT');
      setResult(analysis);
      
      const newHistoryItem: HistoryItem = { 
        id: `int-${Date.now()}`, 
        activityType: 'INTERVIEW', 
        timestamp: Date.now(), 
        questionTitle: cachedQTitle || "Interview Question", 
        type: qType, 
        result: analysis 
      };
      saveHistory([newHistoryItem, ...history]);
      setPhase('result');
      sessionStorage.clear();
      setHasCheckpoint(false);
    } catch (err: any) {
      console.error("[Staff Audit Error]", err);
      const isQuotaExhausted = err instanceof Error && 
        err.message.includes('QUOTA_EXHAUSTED');

      const errorMessage = isQuotaExhausted
        ? 'Daily analysis limit reached. The free API tier has ' +
          'been exhausted for today. Analysis will be available ' +
          'again tomorrow, or you can upgrade your API plan in ' +
          'Google AI Studio.'
        : (err instanceof Error && err.message.includes('429'))
          ? 'Too many requests. Please wait 30 seconds and try again.'
          : 'Staff Audit failed. Your text is saved—you can retry from the dashboard.';
      setApiError(errorMessage);
      setPhase('config');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true); 
    setPhase('analyzing');
    setLoadingStage('UPLOADING_AUDIO');

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const audioBase64 = (reader.result as string).split(',')[1];
        setLoadingStage('TRANSCRIBING');
        const transcript = await geminiService.transcribeAudio(audioBase64, blob.type);
        setInitialTranscript(transcript);
        
        setLoadingStage('GENERATING_FOLLOWUPS');
        const followUpResult = await geminiService.generateFollowUps(currentQuestion.type, currentQuestion.text, transcript);
        if (!followUpResult) throw new Error("Processing failed");
        
        setFollowUpQuestions(followUpResult.followUpQuestions);
        sessionStorage.setItem('last_checkpoint_initial', transcript);
        sessionStorage.setItem('last_checkpoint_questions', JSON.stringify(followUpResult.followUpQuestions));
        sessionStorage.setItem('last_checkpoint_q_title', currentQuestion.text);
        sessionStorage.setItem('last_checkpoint_q_type', currentQuestion.type);
        sessionStorage.setItem('last_checkpoint_time', Date.now().toString());
        setHasCheckpoint(true);
        setPhase('grilling');
      } catch (err) {
        setApiError("Pass 1 failed. For long recordings, ensure stable high-speed internet.");
        setPhase('config');
      } finally {
        setIsProcessing(false);
      }
    };
  };

  const handleStopFollowUp = async (blob: Blob) => {
    if (!currentQuestion) return;
    setIsProcessing(true); 
    setPhase('analyzing');
    setLoadingStage('UPLOADING_AUDIO');

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        setLoadingStage('TRANSCRIBING');
        const followUpTranscript = await geminiService.transcribeAudio(base64, blob.type);
        sessionStorage.setItem('last_checkpoint_followup', followUpTranscript);

        setLoadingStage('GENERATING_LOGIC');
        const analysis = await geminiService.analyzeFullSession(
          currentQuestion.type, 
          currentQuestion.text, 
          initialTranscript || sessionStorage.getItem('last_checkpoint_initial') || "", 
          followUpQuestions || JSON.parse(sessionStorage.getItem('last_checkpoint_questions') || "[]"), 
          followUpTranscript
        );
        
        if (!analysis) throw new Error("Analysis failed");
        setLoadingStage('FINALIZING_AUDIT');
        setResult(analysis);
        
        const newHistoryItem: HistoryItem = { 
          id: `int-${Date.now()}`, 
          activityType: 'INTERVIEW', 
          timestamp: Date.now(), 
          questionTitle: currentQuestion.text, 
          type: currentQuestion.type, 
          result: analysis 
        };
        saveHistory([newHistoryItem, ...history]);
        sessionStorage.clear();
        setHasCheckpoint(false);
        setPhase('result');
      } catch (err: any) {
        const isQuotaExhausted = err instanceof Error && 
          err.message.includes('QUOTA_EXHAUSTED');

        const errorMessage = isQuotaExhausted
          ? 'Daily analysis limit reached. The free API tier has ' +
            'been exhausted for today. Analysis will be available ' +
            'again tomorrow, or you can upgrade your API plan in ' +
            'Google AI Studio.'
          : (err instanceof Error && err.message.includes('429'))
            ? 'Too many requests. Please wait 30 seconds and try again.'
            : 'Pass 2 failed. Your text is saved—retry the Staff Audit from the dashboard.';
        setApiError(errorMessage);
        setPhase('config');
      } finally {
        setIsProcessing(false);
      }
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
     setLoadingStage('UPLOADING_AUDIO');
     const reader = new FileReader();
     reader.readAsDataURL(blob);
     reader.onloadend = async () => {
       try {
         setLoadingStage('TRANSCRIBING');
         const base64 = (reader.result as string).split(',')[1];
         const feedback = await geminiService.verifyDeltaPractice(targetDelta, base64, blob.type);
         setPracticeFeedback(feedback);
       } catch (err) {
         setApiError("Practice verification failed.");
       } finally {
         setIsProcessing(false);
       }
     };
  };

  if (isAuthLoading) return null;
  if (!isAuthorized) return <AccessGate onGrantAccess={() => setIsAuthorized(true)} />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header user={user} onShowHistory={() => setPhase('history')} onShowHome={() => setPhase('config')} onShowSettings={() => setPhase('settings')} onLogout={() => setIsAuthorized(false)} />
      <Container>
        {missingKeyError && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-[2rem] text-amber-800">
            <p className="font-black uppercase text-xs tracking-widest mb-1">Configuration Error</p>
            <p className="text-sm">API Key is missing from environment variables.</p>
          </div>
        )}

        {apiError && (
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-200 rounded-[2rem] text-rose-600 flex justify-between items-center">
            <p className="font-bold text-sm">{apiError}</p>
            <button onClick={() => setApiError(null)} className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Dismiss</button>
          </div>
        )}
        
        {phase === 'config' && (
          <div className="space-y-12">
            <DashboardProgress history={history} />
            {hasCheckpoint && (
              <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-indigo-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">⏳</div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-widest">Incomplete Audit</h4>
                    <p className="text-xs text-indigo-100 font-medium">Session text saved. Resume Staff Audit?</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button onClick={handleResumeAudit} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 shadow-lg active:scale-95">Resume Audit</button>
                  <button onClick={() => { sessionStorage.clear(); setHasCheckpoint(false); }} className="text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white transition">Discard</button>
                </div>
              </div>
            )}
            <h1 className="text-5xl font-black tracking-tighter">Scale up, <span className="text-indigo-600">Product.</span></h1>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              <div className="lg:col-span-2 space-y-6">
                 <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Interview Practice</h3>
                 <div className="flex flex-col gap-8">
                    <button onClick={() => handleStartInterview(InterviewType.PRODUCT_SENSE)} className="relative overflow-hidden group bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[3.5rem] shadow-2xl hover:scale-[1.02] text-left border-4 border-white/10 min-h-[340px]">
                       <div className="relative z-10 flex flex-col h-full text-white">
                          <h3 className="text-4xl font-black mb-2 tracking-tighter">ProductSense</h3>
                          <p className="text-indigo-100 font-bold text-sm leading-relaxed mb-8">Master visionary empathy and user-centric design.</p>
                          <div className="mt-auto bg-white text-indigo-700 font-black px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] w-fit flex items-center space-x-3 shadow-xl group-hover:bg-indigo-50 transition-colors">
                             <span>START SESSION</span>
                             <ArrowRight className="w-4 h-4" />
                          </div>
                       </div>
                    </button>
                    <button onClick={() => handleStartInterview(InterviewType.ANALYTICAL_THINKING)} className="relative overflow-hidden group bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[3.5rem] shadow-2xl hover:scale-[1.02] text-left border-4 border-white/10 min-h-[340px]">
                       <div className="relative z-10 flex flex-col h-full text-white">
                          <h3 className="text-4xl font-black mb-2 tracking-tighter">AnalyticalThinking</h3>
                          <p className="text-emerald-50 font-bold text-sm leading-relaxed mb-8">Execute root cause analysis and metric trade-offs.</p>
                          <div className="mt-auto bg-white text-emerald-700 font-black px-8 py-4 rounded-full text-[11px] uppercase tracking-[0.2em] w-fit flex items-center space-x-3 shadow-xl group-hover:bg-emerald-50 transition-colors">
                             <span>START SESSION</span>
                             <ArrowRight className="w-4 h-4" />
                          </div>
                       </div>
                    </button>
                 </div>
              </div>
              <div className="lg:col-span-3">
                <MissionFeed missions={dailyMissions} isLoading={isMissionsLoading} onRefresh={loadMissions} onComplete={handleMissionComplete} />
              </div>
            </div>
          </div>
        )}
        {phase === 'question' && currentQuestion && (
          <div className="text-center space-y-12 py-12">
            <h2 className="text-4xl font-black text-slate-900 leading-tight max-w-3xl mx-auto">{currentQuestion.text}</h2>
            <div className="flex justify-center gap-4">
               <button onClick={() => setPhase('recording')} className="bg-indigo-600 text-white font-black py-6 px-16 rounded-[2rem] text-xl shadow-xl hover:bg-indigo-700 active:scale-95">Begin My Response</button>
               <button onClick={handleNextQuestion} className="bg-slate-100 text-slate-600 font-black py-6 px-10 rounded-[2rem] text-xl hover:bg-slate-200 active:scale-95">Next</button>
               <button onClick={() => setPhase('config')} className="bg-slate-100 text-slate-600 font-black py-6 px-10 rounded-[2rem] text-xl hover:bg-slate-200 active:scale-95">Cancel</button>
            </div>
          </div>
        )}
        {phase === 'recording' && <Recorder onStop={handleStopRecording} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={currentQuestion?.text} minDuration={120} />}
        {phase === 'grilling' && (
          <div className="text-center space-y-10 py-12">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">The Staff Audit Grill</h3>
            <h4 className="text-2xl font-black">Defend your logic against follow-ups:</h4>
            <div className="space-y-4 max-w-xl mx-auto">
              {followUpQuestions.map((q, i) => (
                <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl font-bold italic shadow-sm">{q}</div>
              ))}
            </div>
            <button onClick={() => setPhase('recording-followup')} className="bg-rose-600 text-white font-black py-6 px-16 rounded-[2rem] text-xl shadow-xl hover:bg-rose-700 active:scale-95">Defend Logic</button>
          </div>
        )}
        {phase === 'recording-followup' && <Recorder onStop={handleStopFollowUp} onCancel={() => setPhase('config')} isProcessing={isProcessing} prompt={followUpQuestions} minDuration={60} />}
        {phase === 'analyzing' && (
          <div className="py-24 text-center space-y-8">
            <div className="text-4xl font-black text-slate-900 animate-pulse tracking-tight uppercase">
              {loadingStage === 'UPLOADING_AUDIO' && "Uploading Audio..."}
              {loadingStage === 'TRANSCRIBING' && "Pass 1: Deciphering Speech..."}
              {loadingStage === 'GENERATING_FOLLOWUPS' && "Pass 2: Crafting Grill Qs..."}
              {loadingStage === 'GENERATING_LOGIC' && "Pass 3: Staff Deep Audit..."}
              {loadingStage === 'FINALIZING_AUDIT' && "Finalizing Audit..."}
              {loadingStage === 'SEARCHING_RESOURCES' && "Searching Resources..."}
            </div>
            <div className="max-w-xs mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
               <div className={`h-full bg-indigo-600 transition-all duration-1000 ease-out ${
                 loadingStage === 'UPLOADING_AUDIO' ? 'w-1/6' : 
                 loadingStage === 'TRANSCRIBING' ? 'w-2/6' : 
                 loadingStage === 'GENERATING_FOLLOWUPS' ? 'w-3/6' : 
                 loadingStage === 'GENERATING_LOGIC' ? 'w-5/6' : 'w-[98%]'
               }`}></div>
            </div>
            <p className="text-sm font-bold text-slate-400 max-w-sm mx-auto leading-relaxed">
              {loadingStage === 'GENERATING_LOGIC' 
                ? "The Staff Audit performs high-level reasoning on your logic, second-order effects, and metric precision. This deep reasoning can take up to 45 seconds."
                : "Optimizing session data for secure processing..."}
            </p>
          </div>
        )}
        {phase === 'result' && result && <FeedbackView result={result} onReset={() => setPhase('config')} onPracticeDelta={handlePracticeDelta} isProductSense={currentQuestion?.type === InterviewType.PRODUCT_SENSE} />}
        {phase === 'history' && <HistoryList history={history} onSelect={(item) => { setResult(item.result); setPhase('result'); }} onClear={() => saveHistory([])} />}
        {phase === 'settings' && user && <SettingsView user={user} onUpdate={(u) => { setUser({...user, ...u}); localStorage.setItem('pm_coach_personal_user', JSON.stringify({...user, ...u})); }} onDeleteAccount={() => { localStorage.clear(); window.location.reload(); }} onBack={() => setPhase('config')} />}
      </Container>
    </div>
  );
};

export default App;