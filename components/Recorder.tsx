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

  const SPEECH_THRESHOLD = 20;

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
      for (let i = 0; i < activeFreqs; i++) sum += dataArray[i];
      const averageVolume = sum / activeFreqs;
      
      if (averageVolume > SPEECH_THRESHOLD) {
        setAudioDetected(true);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;
      const barSpacing = 4;
      const barWidth = (canvas.width / activeFreqs) - barSpacing;

      for (let i = 0; i < activeFreqs; i++) {
        const target = dataArray[i];
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
      // Phase 2: Hardware-level constraints for mono, 16kHz audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000 // Ensure AudioContext also uses optimized rate
      });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256; 

      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Voice-only optimized bitrate
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        onStop(audioBlob);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setAudioDetected(false);
      startTimer();
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please check browser permissions.");
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (timerRef.current) clearInterval(timerRef.current);
    if (sourceRef.current) sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
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
    return () => cleanup();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-12 py-8 w-full max-w-4xl mx-auto">
      {prompt && (
        <div className="w-full px-6 py-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
          <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 text-center">Reference Prompt</h3>
          <p className="text-xl font-bold text-slate-800 text-center leading-snug">
            {Array.isArray(prompt) ? prompt[0] : prompt}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center space-y-6">
        <div className={`text-8xl font-black tabular-nums transition-all ${isRecording ? 'text-slate-900 scale-110' : 'text-slate-300'}`}>
          {formatTime(duration)}
        </div>
        <div className={`relative w-full max-w-lg h-32 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
          <canvas ref={canvasRef} width={600} height={128} className="w-full h-full" />
        </div>
      </div>

      <div className="flex items-center space-x-10">
        <button onClick={onCancel} className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition shadow-md">
           <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button
          onClick={isRecording ? handleStop : startRecording}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition shadow-2xl ${isRecording ? 'bg-red-600 ring-4 ring-red-100' : 'bg-indigo-600 ring-4 ring-indigo-100'} active:scale-95`}
        >
          {isRecording ? <div className="w-10 h-10 bg-white rounded-lg"></div> : <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
        </button>
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center space-y-3 animate-pulse">
           <span className="text-indigo-600 font-black text-sm uppercase tracking-widest">Optimizing Data...</span>
        </div>
      )}
    </div>
  );
};