import React, { useState } from 'react';
import { InterviewType } from '../types.ts';

interface CustomQuestionInputProps {
  onStart: (question: string, type: InterviewType) => void;
  onCancel: () => void;
}

export const CustomQuestionInput: React.FC<CustomQuestionInputProps> = ({ onStart, onCancel }) => {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<InterviewType>(InterviewType.PRODUCT_SENSE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      alert("Please enter a more detailed question (min 10 characters).");
      return;
    }
    onStart(question.trim(), type);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 space-y-8">
          <div className="text-center">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">
              Custom Session
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Practice Your Own Question</h2>
            <p className="text-slate-500 mt-2 font-medium">Found a question online or in a book? Paste it here.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Question Text
              </label>
              <textarea
                autoFocus
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., Design a high-tech refrigerator for high-end restaurants..."
                className="w-full h-40 px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium resize-none leading-relaxed text-slate-800"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Evaluation Track
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType(InterviewType.PRODUCT_SENSE)}
                  className={`flex items-center justify-center space-x-3 p-5 rounded-2xl border-2 transition-all ${
                    type === InterviewType.PRODUCT_SENSE
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100'
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="text-xl">💡</span>
                  <span className="font-bold">Product Sense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType(InterviewType.ANALYTICAL_THINKING)}
                  className={`flex items-center justify-center space-x-3 p-5 rounded-2xl border-2 transition-all ${
                    type === InterviewType.ANALYTICAL_THINKING
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-100'
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <span className="text-xl">📊</span>
                  <span className="font-bold">Execution</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic text-center px-4">
                This determines which rubric the AI uses to evaluate your performance.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
              >
                Begin Practice
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-2xl transition-all transform active:scale-95 uppercase tracking-widest text-xs"
              >
                Go Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};