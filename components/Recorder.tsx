
import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onStop: (blob: Blob) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onStop, onCancel, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [speechDuration, setSpeechDuration] = useState(0);
  const [audioDetected, setAudioDetected] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const smoothedDataRef = useRef<number[]>([]);
  const maxVolumeReachedRef = useRef<number>(0);

  const SPEECH_THRESHOLD = 20;
  const MIN_REQUIRED_DURATION = 120; // 2 minutes
  const MIN_REQUIRED_SPEECH = 60;   // 1 minute

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
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
      for (let i = 0; i < activeFreqs; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / activeFreqs;
      setCurrentVolume(averageVolume);
      
      if (averageVolume > 15) {
        setAudioDetected(true);
        maxVolumeReachedRef.current = Math.max(maxVolumeReachedRef.current, averageVolume);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const intensity = averageVolume / 128;
      const centerY = canvas.height / 2;
      const barSpacing = 4;
      const totalBars = activeFreqs;
      const barWidth = (canvas.width / totalBars) - barSpacing;

      for (let i = 0; i < activeFreqs; i++) {
        const target = dataArray[i];
        if (target > smoothedDataRef.current[i]) {
          smoothedDataRef.current[i] = target * 0.4 + smoothedDataRef.current[i] * 0.6;
        } else {
          smoothedDataRef.current[i] = target * 0.15 + smoothedDataRef.current[i] * 0.85;
        }
        
        const value = smoothedDataRef.current[i];
        const barHeight = Math.max(3, (value / 255) * canvas.height * 0.9);
        const positions = [
            (canvas.width / 2) + (i * (barWidth + barSpacing)),
            (canvas.width / 2) - (i * (barWidth + barSpacing)) - barWidth
        ];

        positions.forEach(x => {
            if (x < -barWidth || x > canvas.width) return;
            const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
            gradient.addColorStop(0, '#4f46e5');
            gradient.addColorStop(0.5, '#a5b4fc');
            gradient.addColorStop(1, '#4f46e5');
            ctx.fillStyle = gradient;
            const radius = Math.max(1, barWidth / 2);
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, radius);
            } else {
                ctx.rect(x, centerY - barHeight / 2, barWidth, barHeight);
            }
            ctx.fill();
        });
      }
    };
    draw();
  };

  useEffect(() => {
    if (isRecording && !isPaused && currentVolume > SPEECH_THRESHOLD) {
      const interval = setInterval(() => {
        setSpeechDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording, isPaused, currentVolume]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256; 

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      maxVolumeReachedRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onStop(audioBlob);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setSpeechDuration(0);
      setAudioDetected(false);
      startTimer();
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to practice.");
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
        audioContextRef.current = null;
    }
    if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        sourceRef.current = null;
    }
    analyserRef.current = null;
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (duration < MIN_REQUIRED_DURATION) {
      alert(`Your response is too short. Please speak for at least 2 minutes (Current: ${formatTime(duration)}) to ensure deep AI analysis.`);
      return;
    }
    if (!audioDetected || maxVolumeReachedRef.current < SPEECH_THRESHOLD) {
      alert("We didn't detect enough audio. Please ensure your microphone is working.");
      return;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Discard current recording and start again?")) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      }
      cleanup();
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setSpeechDuration(0);
      audioChunksRef.current = [];
      setTimeout(() => startRecording(), 50);
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording) {
      if (!window.confirm("Are you sure you want to cancel? This recording will be lost.")) return;
    }
    cleanup();
    onCancel();
  };

  const togglePause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      setIsPaused(false);
      startTimer();
    } else {
      mediaRecorderRef.current.pause();
      if (audioContextRef.current?.state === 'running') audioContextRef.current.suspend();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-12 py-8">
      <div className="flex flex-col items-center space-y-6 w-full pointer-events-none select-none">
        <div className="h-10 flex flex-col items-center justify-end">
          {isRecording && (
            <div className={`flex items-center space-x-2 ${isPaused ? '' : 'animate-pulse'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-600'}`}></div>
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isPaused ? 'text-amber-500' : 'text-red-600'}`}>
                {isPaused ? 'Recording Paused' : 'Live Recording'}
              </span>
            </div>
          )}
        </div>

        <div className={`text-8xl font-black tracking-tighter tabular-nums transition-all duration-500 ${
          isRecording ? (isPaused ? 'text-amber-500' : 'text-slate-900 scale-110') : 'text-slate-300'
        }`}>
          {formatTime(duration)}
        </div>

        <div className={`relative w-full max-w-lg h-32 flex items-center justify-center transition-all duration-500 ${isRecording ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <canvas ref={canvasRef} width={600} height={128} className="w-full h-full rounded-3xl" />
        </div>
      </div>

      <div className="flex items-center justify-center space-x-10 relative z-50">
        <button
          type="button"
          onClick={handleCancelClick}
          className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-md active:scale-90"
          title="Cancel"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          type="button"
          onClick={isRecording ? handleStop : startRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 ${
            isRecording 
              ? 'bg-red-600 border-4 border-red-200' 
              : 'bg-indigo-600 border-4 border-indigo-200'
          } disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
          title={isRecording ? "Finish & Analyze" : "Start Recording"}
        >
          {isRecording ? (
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm"></div>
          ) : (
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {isRecording && (
          <div className="flex space-x-6">
            <button
              type="button"
              onClick={togglePause}
              title={isPaused ? "Resume" : "Pause"}
              className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-md active:scale-90"
            >
              {isPaused ? <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>}
            </button>
            
            <button
              type="button"
              onClick={handleRestart}
              title="Restart Recording"
              className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-amber-300 hover:text-amber-600 transition-all shadow-md active:scale-90"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="max-w-xs text-center pointer-events-none">
        {!isRecording && !isProcessing && (
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min 2m recommended for best analysis</p>
        )}
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center space-y-4 pt-4">
          <div className="flex items-center space-x-3 text-indigo-600 font-black text-sm uppercase tracking-widest">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Analyzing Performance...</span>
          </div>
        </div>
      )}
    </div>
  );
};
