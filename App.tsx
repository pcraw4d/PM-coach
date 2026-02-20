
import React, { useState, useEffect } from 'react';
import { Header, Container } from './components/Layout';
import { Recorder } from './components/Recorder';
import { FeedbackView } from './components/FeedbackView';
import { HistoryList } from './components/HistoryList';
import { AuthView } from './components/AuthView';
import { OnboardingView } from './components/OnboardingView';
import { SettingsView } from './components/SettingsView';
import { CustomQuestionInput } from './components/CustomQuestionInput';
import { InterviewType, Question, InterviewPhase, InterviewResult, StoredInterview, User } from './types';
import { QUESTIONS } from './constants';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>('auth');
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<StoredInterview[]>([]);

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
          avatarSeed: foundUser.avatarSeed,
          joinedAt: foundUser.joinedAt || Date.now(),
          hasCompletedOnboarding: foundUser.hasCompletedOnboarding
        });
        setPhase(foundUser.hasCompletedOnboarding ? 'config' : 'onboarding');
      }
    }
  }, []);

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

  useEffect(() => {
    if (user) {
      localStorage.setItem(`pm_history_${user.id}`, JSON.stringify(history));
    }
  }, [history, user]);

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
    localStorage.setItem('pm_coach_active_user_id', authUser.id);
    setPhase(authUser.hasCompletedOnboarding ? 'config' : 'onboarding');
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

  const handleOnboardingComplete = (type: InterviewType) => {
    if (!user) return;
    const updatedUser = { ...user, hasCompletedOnboarding: true };
    setUser(updatedUser);
    const users = JSON.parse(localStorage.getItem('pm_coach_users') || '[]');
    const updatedUsers = users.map((u: any) => u.id === user.id ? { ...u, hasCompletedOnboarding: true } : u);
    localStorage.setItem('pm_coach_users', JSON.stringify(updatedUsers));
    startInterview(type);
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
    } catch (err: any) {
      console.error("Analysis failed", err);
      
      if (err.message && err.message.includes("Requested entity was not found")) {
        alert("Gemini 3 Pro access required. Please select a valid API key with billing enabled.");
        if (typeof window.aistudio?.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
        }
      } else {
        alert("Analysis failed: " + (err.message || "Unknown error"));
      }
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user}
        onShowHistory={() => setPhase('history')} 
        onShowHome={() => setPhase(user ? (user.hasCompletedOnboarding ? 'config' : 'onboarding') : 'auth')} 
        onShowSettings={() => setPhase('settings')}
        onLogout={handleLogout}
      />
      <Container>
        {phase === 'auth' && <AuthView onAuthSuccess={handleAuthSuccess} />}
        {phase === 'onboarding' && user && <OnboardingView userName={user.name} onComplete={handleOnboardingComplete} />}
        {phase === 'settings' && user && (
          <SettingsView 
            user={user} 
            onUpdate={(u) => setUser({...user, ...u})} 
            onDeleteAccount={() => handleLogout()}
            onBack={() => setPhase('config')}
          />
        )}
        {phase === 'custom-input' && <CustomQuestionInput onStart={startCustomInterview} onCancel={() => setPhase('config')} />}
        {phase === 'config' && user && (
          <div className="text-center space-y-12 py-10 animate-in fade-in zoom-in-95 duration-500">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Master the <span className="text-indigo-600">PM</span> Interview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <button onClick={() => startInterview(InterviewType.PRODUCT_SENSE)} className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-indigo-500 transition shadow-sm text-left">
                <h3 className="text-2xl font-bold mb-2">Product Sense</h3>
                <p className="text-slate-500 text-sm">Design & strategy focus.</p>
              </button>
              <button onClick={() => startInterview(InterviewType.ANALYTICAL_THINKING)} className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-emerald-500 transition shadow-sm text-left">
                <h3 className="text-2xl font-bold mb-2">Execution</h3>
                <p className="text-slate-500 text-sm">Metrics & trade-offs focus.</p>
              </button>
              <button onClick={() => setPhase('custom-input')} className="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-amber-500 transition shadow-sm text-left">
                <h3 className="text-2xl font-bold mb-2">Custom Session</h3>
                <p className="text-slate-500 text-sm">Enter your own prompt.</p>
              </button>
            </div>
          </div>
        )}
        {(phase === 'question' || phase === 'analyzing') && currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-12 py-10">
            <h2 className="text-3xl font-bold text-center">{currentQuestion.text}</h2>
            <Recorder onStop={handleRecordingStop} onCancel={() => setPhase('config')} isProcessing={isProcessing} />
          </div>
        )}
        {phase === 'result' && result && <FeedbackView result={result} onReset={reset} isProductSense={selectedType === InterviewType.PRODUCT_SENSE} />}
        {phase === 'history' && <HistoryList history={history} onSelect={(i) => {setResult(i.result); setPhase('result')}} onClear={() => setHistory([])} />}
      </Container>
    </div>
  );
};

export default App;
