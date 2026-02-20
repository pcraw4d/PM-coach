
import React, { useState, useRef, useEffect } from 'react';

interface RecorderProps {
  onStop: (blob: Blob) => void;
  isProcessing: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onStop, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // Visualization refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Smoothing state for visualization
  const smoothedDataRef = useRef<number[]>([]);

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
    
    // Initialize smoothing array if needed
    if (smoothedDataRef.current.length !== bufferLength) {
      smoothedDataRef.current = new Array(bufferLength).fill(0);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate average volume for dynamic effects
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / bufferLength;
      const intensity = averageVolume / 128; // Normalized 0-2 (approx)

      const barWidth = (canvas.width / bufferLength) * 2;
      const centerY = canvas.height / 2;
      
      // Draw background glow based on volume
      if (intensity > 0.1) {
        const glowGradient = ctx.createRadialGradient(
          canvas.width / 2, centerY, 10,
          canvas.width / 2, centerY, canvas.width / 2
        );
        glowGradient.addColorStop(0, `rgba(79, 70, 229, ${0.1 * intensity})`);
        glowGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (let i = 0; i < bufferLength; i++) {
        // Apply smoothing: targetValue * smoothingFactor + currentValue * (1 - smoothingFactor)
        smoothedDataRef.current[i] = dataArray[i] * 0.2 + smoothedDataRef.current[i] * 0.8;
        
        const value = smoothedDataRef.current[i];
        // Scale height and add a minimum visible height when recording
        const barHeight = Math.max(2, (value / 255) * canvas.height * 0.8);

        // Dynamic gradient based on amplitude
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        
        if (intensity > 0.6) {
          // "Hot" state - louder volume
          gradient.addColorStop(0, '#818cf8'); // indigo-400
          gradient.addColorStop(0.5, '#c084fc'); // purple-400
          gradient.addColorStop(1, '#818cf8');
        } else {
          // Normal state
          gradient.addColorStop(0, '#4f46e5'); // indigo-600
          gradient.addColorStop(0.5, '#a5b4fc'); // indigo-300
          gradient.addColorStop(1, '#4f46e5');
        }

        ctx.fillStyle = gradient;
        
        // Draw rounded bars symmetrically
        const x = i * barWidth;
        const radius = barWidth / 2 - 1;
        
        // Use fillRect with a bit of spacing
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight, radius);
        } else {
            // Fallback for browsers without roundRect
            ctx.rect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight);
        }
        ctx.fill();
      }
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Audio Analysis
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 128; // Smaller FFT for smoother, wider bars
      analyserRef.current.smoothingTimeConstant = 0.8;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onStop(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        // Clean up visualization
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      startTimer();
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to practice.");
    }
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      setIsPaused(false);
      startTimer();
    } else {
      mediaRecorderRef.current.pause();
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current.suspend();
      }
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center space-y-8 py-6">
      <div className="flex flex-col items-center space-y-4 w-full">
        {isRecording && (
          <div className={`flex items-center space-x-2 ${isPaused ? '' : 'animate-pulse'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-600'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isPaused ? 'text-amber-500' : 'text-red-600'}`}>
              {isPaused ? 'Recording Paused' : 'Live Recording'}
            </span>
          </div>
        )}

        <div className={`text-7xl font-black tracking-tighter tabular-nums transition-all duration-500 ${
          isRecording ? (isPaused ? 'text-amber-500' : 'text-slate-900 scale-110') : 'text-slate-300'
        }`}>
          {formatTime(duration)}
        </div>

        {/* Enhanced Waveform Visualization */}
        <div className={`relative w-full max-w-md h-32 flex items-center justify-center transition-all duration-500 ${isRecording ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <canvas 
            ref={canvasRef} 
            width={448} 
            height={128} 
            className="w-full h-full rounded-3xl"
          />
        </div>

        {!isRecording && !isProcessing && (
          <p className="text-slate-400 font-medium text-sm">Ready to begin your response</p>
        )}
      </div>

      <div className="flex items-center space-x-6 relative">
        <div className="relative group">
          {isRecording && !isPaused && (
            <div className="absolute inset-0 -m-4 animate-ping bg-red-400 rounded-full opacity-10 pointer-events-none"></div>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            title={isRecording ? "Stop and Submit" : "Start Recording"}
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 ${
              isRecording 
                ? 'bg-red-600 border-4 border-red-200' 
                : 'bg-indigo-600 border-4 border-indigo-200'
            } disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <div className="w-10 h-10 bg-white rounded-lg shadow-sm"></div>
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        {isRecording && (
          <button
            onClick={togglePause}
            title={isPaused ? "Resume Recording" : "Pause Recording"}
            className="relative z-20 w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-md active:scale-90 cursor-pointer"
          >
            {isPaused ? (
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="max-w-xs text-center">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
          {isRecording ? (isPaused ? 'Paused — Click play to resume' : 'Click square to stop and analyze') : 'Click microphone to start'}
        </p>
        {duration > 180 && isRecording && !isPaused && (
          <p className="mt-2 text-xs text-amber-600 font-bold animate-bounce">
            💡 Pro-Tip: Try to keep responses under 3 mins
          </p>
        )}
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center space-y-4 pt-4">
          <div className="flex items-center space-x-3 text-indigo-600 font-black text-sm uppercase tracking-widest">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Analyzing Performance</span>
          </div>
          <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      )}
    </div>
  );
};
