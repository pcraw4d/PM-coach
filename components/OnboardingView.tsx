
import React, { useState } from 'react';
import { InterviewType } from '../types';

interface OnboardingViewProps {
  userName: string;
  onComplete: (type: InterviewType) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ userName, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);

  const firstName = userName.split(' ')[0];

  const nextStep = () => setStep(prev => prev + 1);

  return (
    <div className="max-w-3xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-2 mb-12">
        {[1, 2, 3, 4].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 rounded-full transition-all duration-500 ${
              s === step ? 'w-12 bg-indigo-600' : s < step ? 'w-6 bg-indigo-200' : 'w-6 bg-slate-100'
            }`}
          />
        ))}
      </div>

      <div className="bg-white p-10 sm:p-16 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        {/* Step 1: Value Proposition */}
        {step === 1 && (
          <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 transform -rotate-6">
              <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Welcome, {firstName}!</h2>
              <p className="text-xl text-slate-500 leading-relaxed max-w-lg mx-auto">
                PM Coach AI is your private arena to master Product Management interviews using the power of <span className="text-indigo-600 font-bold">Gemini 3</span>.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left py-4">
              {[
                { icon: '🎯', title: 'Structured', text: 'Real industry rubrics' },
                { icon: '🎙️', title: 'Voice First', text: 'Simulate real pressure' },
                { icon: '📈', title: 'Actionable', text: 'Personalized growth plans' }
              ].map((feature, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{feature.title}</h4>
                  <p className="text-xs text-slate-500 leading-tight">{feature.text}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={nextStep}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 2: Select Track */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Choose Your Track</h2>
              <p className="text-slate-500 font-medium">Which area do you want to focus on for your first session?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button 
                onClick={() => { setSelectedType(InterviewType.PRODUCT_SENSE); nextStep(); }}
                className="group relative bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-indigo-600 transition-all text-left overflow-hidden shadow-sm hover:shadow-xl"
              >
                <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-300">💡</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Product Sense</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Design thinking, user personas, and visionary problem-solving.</p>
              </button>
              <button 
                onClick={() => { setSelectedType(InterviewType.ANALYTICAL_THINKING); nextStep(); }}
                className="group relative bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-emerald-600 transition-all text-left overflow-hidden shadow-sm hover:shadow-xl"
              >
                <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-300">📊</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Execution</h3>
                <p className="text-sm text-slate-500 leading-relaxed">Metrics, root cause analysis, and data-driven trade-offs.</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Explanation of Process */}
        {step === 3 && (
          <div className="space-y-10 text-center animate-in fade-in slide-in-from-right-4">
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">How It Works</h2>
              <p className="text-slate-500 font-medium max-w-md mx-auto">Practicing with voice is the only way to build real muscle memory.</p>
            </div>
            
            <div className="space-y-6 text-left max-w-sm mx-auto">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <p className="text-sm text-slate-600 font-medium pt-1">We present a high-stakes PM interview question.</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <p className="text-sm text-slate-600 font-medium pt-1">You record your response. <span className="font-bold text-slate-900">Minimum 2 minutes</span> required for deep analysis.</p>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <p className="text-sm text-slate-600 font-medium pt-1">Gemini AI evaluates your response against elite rubrics instantly.</p>
              </div>
            </div>

            <button 
              onClick={nextStep}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 px-12 rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
            >
              I'm Ready
            </button>
          </div>
        )}

        {/* Step 4: Final Kickoff */}
        {step === 4 && (
          <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-emerald-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Time to Shine</h2>
              <p className="text-xl text-slate-500 leading-relaxed">
                Take a deep breath. We've selected a premier <span className="text-indigo-600 font-bold">{selectedType === InterviewType.PRODUCT_SENSE ? 'Product Sense' : 'Execution'}</span> question for you.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => selectedType && onComplete(selectedType)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-16 rounded-[2rem] shadow-2xl shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 text-lg uppercase tracking-widest"
              >
                Show Me The Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
