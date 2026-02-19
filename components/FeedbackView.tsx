
import React from 'react';
import { InterviewResult } from '../types';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface FeedbackViewProps {
  result: InterviewResult;
  onReset: () => void;
  isProductSense: boolean;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ result, onReset, isProductSense }) => {
  const radarData = result.rubricScores.map(rs => ({
    subject: rs.category,
    A: rs.score,
    fullMark: 10
  }));

  const methodologyName = isProductSense 
    ? "Lenny's Product Sense Guide" 
    : "Lenny's Execution/Analytical Guide";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-bold">Analysis Complete</h2>
          <p className="text-indigo-100 max-w-md">
            Your response has been evaluated against the 
            <span className="font-bold underline decoration-indigo-300 ml-1">{methodologyName}</span>.
          </p>
        </div>
        <div className="flex items-center justify-center w-28 h-28 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20">
          <div className="text-center">
            <span className="block text-3xl font-black leading-none">{result.overallScore}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Overall</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Col: Overview */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              Performance Breakdown
              <span className="text-xs font-normal text-slate-400">Scale: 1-10</span>
            </h3>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 space-y-4">
               {result.rubricScores.map((score, idx) => (
                 <div key={idx} className="space-y-1 border-l-2 border-indigo-100 pl-4">
                   <div className="flex justify-between text-sm">
                     <span className="font-semibold text-slate-700">{score.category}</span>
                     <span className="font-bold text-indigo-600">{score.score}/10</span>
                   </div>
                   <p className="text-xs text-slate-500 leading-relaxed">{score.reasoning}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Strengths
            </h3>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-slate-600 flex items-start text-sm">
                  <span className="text-indigo-500 mr-2">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Col: Details */}
        <div className="flex-1 space-y-6">
          <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Response Transcript</h3>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              </div>
            </div>
            <p className="text-sm leading-relaxed opacity-80 italic font-serif">"{result.transcription}"</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Improvement Plan
            </h3>
            <ul className="space-y-2 mb-6">
              {result.improvementAreas.map((ia, i) => (
                <li key={i} className="text-slate-600 flex items-start text-sm">
                  <span className="text-amber-500 mr-2">•</span>
                  {ia}
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-widest">Recommended Learning</h3>
            <div className="grid gap-3">
              {result.recommendedResources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition group"
                >
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition">
                    {res.type === 'video' ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900 line-clamp-1">{res.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">{res.type}</p>
                  </div>
                  <svg className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onReset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl transition transform hover:-translate-y-1 active:scale-95"
        >
          Practice Next Question
        </button>
      </div>
    </div>
  );
};
