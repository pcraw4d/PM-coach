import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onStop: (blob: Blob) => void;
  onCancel: () => void;
  isProcessing: boolean;
  prompt?: string | string[];
  minDuration?: number; // In seconds
}

export const Recorder: React.FC<RecorderProps> = ({ 
  onStop, 
  onCancel, 
  isProcessing, 
  prompt, 
  minDuration = 120 // Default to 2 minutes
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioDetected, setAudioDetected] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const smoothedDataRef = useRef<number[]>([]);
  const isExitingRef = useRef(false);

  const SPEECH_THRESHOLD = 20;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const activeFreqs = Math.floor(bufferLength * 0.8);
    
    if (smoothedDataRef.current.length !== activeFreqs) {
      smoothedDataRef.current = new Array(activeFreqs).fill(0);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < activeFreqs; i++) sum += dataArray[i];
      const averageVolume = sum / activeFreqs;
      
      if (averageVolume > SPEECH_THRESHOLD && !isPaused) {
        setAudioDetected(true);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;
      const barSpacing = 4;
      const barWidth = (canvas.width / activeFreqs) - barSpacing;

      for (let i = 0; i < activeFreqs; i++) {
        const target = isPaused ? 5 : dataArray[i];
        smoothedDataRef.current[i] = target * 0.4 + (smoothedDataRef.current[i] || 0) * 0.6;
        const value = smoothedDataRef.current[i];
        const barHeight = Math.max(3, (value / 255) * canvas.height * 0.9);
        const x = (canvas.width / 2) + (i % 2 === 0 ? (i/2) * (barWidth + barSpacing) : -((i+1)/2) * (barWidth + barSpacing));

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, '#4f46e5');
        gradient.addColorStop(0.5, '#a5b4fc');
        gradient.addColorStop(1, '#4f46e5');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if ((ctx as any).roundRect) {
            (ctx as any).roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
        } else {
            ctx.rect(x, centerY - barHeight / 2, barWidth, barHeight);
        }
        ctx.fill();
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 
      });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256; 

      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 
      };
      
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // If we are exiting via handleExit, do NOT trigger onStop logic in the parent
        if (isExitingRef.current) {
          cleanup();
          return;
        }

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          onStop(audioBlob);
        }
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setAudioDetected(false);
      isExitingRef.current = false;
      startTimer();
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please check browser permissions.");
    }
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        cleanup();
        startRecording();
      };
      mediaRecorderRef.current.stop();
    } else {
      startRecording();
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      startTimer();
    } else {
      mediaRecorderRef.current.pause();
      stopTimer();
    }
    setIsPaused(!isPaused);
  };

  const handleExit = (e: React.MouseEvent) => {
    e.preventDefault();
    isExitingRef.current = true; // Flag that we are exiting to prevent onStop being called
    
    // Stop recorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    cleanup();
    onCancel(); // This triggers setPhase('config') in App.tsx
  };

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.mediaStream.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (duration < minDuration) {
      alert(`Minimum speaking time is ${minDuration}s for a high-quality audit. Current: ${duration}s.`);
      return;
    }
    if (!audioDetected) {
      alert("We didn't detect any audio. Please verify your microphone is active.");
      return;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      isExitingRef.current = true;
      cleanup();
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-8 py-8 w-full max-w-4xl mx-auto">
      {prompt && (
        <div className="w-full px-8 py-10 bg-white border border-slate-200 rounded-[3rem] shadow-sm">
          <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-4 text-center">Reference Prompt</h3>
          {Array.isArray(prompt) ? (
            <div className="space-y-4 text-left max-w-3xl mx-auto">
              {prompt.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-indigo-500 font-black text-xl mt-0.5">•</span>
                  <p className="text-xl font-black text-slate-800 leading-tight">{p}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xl font-black text-slate-800 text-center leading-tight">
              {prompt}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center space-y-4">
        <div className={`text-9xl font-black tabular-nums transition-all ${isRecording ? 'text-slate-900' : 'text-slate-300'}`}>
          {formatTime(duration)}
        </div>
        <div className={`relative w-full max-w-lg h-32 transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <canvas ref={canvasRef} width={600} height={128} className="w-full h-full" />
        </div>
      </div>

      <div className="flex items-center space-x-8 bg-white/50 backdrop-blur-sm p-4 rounded-[4rem] border border-slate-100 shadow-xl shadow-slate-200/50">
        {/* Exit Button - HOME DASHBOARD */}
        <button 
          onClick={handleExit} 
          className="w-16 h-16 rounded-full bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600 transition shadow-md flex items-center justify-center group"
          title="Exit Session"
        >
           <svg className="w-8 h-8 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
           </svg>
        </button>

        {/* Restart Button */}
        {isRecording && (
          <button 
            onClick={handleRestart}
            className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-md flex items-center justify-center group"
            title="Restart Recording"
          >
             <svg className="w-8 h-8 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
             </svg>
          </button>
        )}

        {/* Main Record/Stop Button */}
        <button
          onClick={isRecording ? handleStop : startRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition shadow-2xl transform active:scale-95 ${
            isRecording 
              ? 'bg-white ring-8 ring-rose-100 border-4 border-rose-50' 
              : 'bg-indigo-600 ring-8 ring-indigo-100'
          }`}
        >
          {isRecording ? (
            <div className="w-10 h-10 bg-rose-600 rounded-lg animate-pulse"></div>
          ) : (
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Pause/Resume Button */}
        {isRecording && (
          <button 
            onClick={togglePause}
            className={`w-16 h-16 rounded-full transition shadow-md flex items-center justify-center ${
              isPaused 
                ? 'bg-indigo-600 text-white shadow-indigo-200' 
                : 'bg-slate-100 text-slate-500 hover:bg-indigo-50'
            }`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {isPaused ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            )}
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center space-y-3">
           <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <span className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Running Staff Audit...</span>
        </div>
      )}
    </div>
  );
};