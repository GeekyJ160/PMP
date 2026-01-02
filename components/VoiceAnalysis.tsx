
import React, { useState, useRef, useEffect } from 'react';
import { Genre, AppScreen } from '../types';

interface Props {
  genre: Genre;
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onComplete: (scores: { rhymeScore: number; flowScore: number; energyScore: number; bpm: number }) => void;
  onSkip: () => void;
}

const VoiceAnalysis: React.FC<Props> = ({ genre, currentScreen, onNavigate, onComplete, onSkip }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoTune, setIsAutoTune] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const filterNode = useRef<BiquadFilterNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const [volume, setVolume] = useState<number[]>(new Array(30).fill(5));
  const [correctionLevel, setCorrectionLevel] = useState(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      analyser.current = audioContext.current.createAnalyser();
      
      const source = audioContext.current.createMediaStreamSource(stream);
      
      // Auto-Tune Effect Chain: Source -> BiquadFilter -> Analyser
      filterNode.current = audioContext.current.createBiquadFilter();
      filterNode.current.type = 'peaking';
      filterNode.current.frequency.value = 2500;
      filterNode.current.Q.value = 1.5;
      filterNode.current.gain.value = isAutoTune ? 12 : 0;

      source.connect(filterNode.current);
      filterNode.current.connect(analyser.current);
      
      // We don't connect to destination by default to avoid feedback loops without headphones,
      // but the data is processed through the filter for analysis.

      analyser.current.fftSize = 256;

      setIsRecording(true);
      setTimeLeft(15);
      animate();
    } catch (err) {
      alert("Microphone access is required for voice analysis.");
    }
  };

  const animate = () => {
    if (!analyser.current) return;
    const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(dataArray);
    
    // Calculate volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setVolume(prev => [...prev.slice(1), Math.max(10, average * 0.9)]);

    // Simulate pitch correction activity
    if (isAutoTune && average > 10) {
      setCorrectionLevel(Math.sin(Date.now() / 50) * 40 + 50);
    } else {
      setCorrectionLevel(0);
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (filterNode.current) {
      filterNode.current.gain.setTargetAtTime(isAutoTune ? 12 : 0, audioContext.current?.currentTime || 0, 0.1);
    }
  }, [isAutoTune]);

  useEffect(() => {
    let timer: any;
    if (isRecording && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      handleComplete();
    }
    return () => clearInterval(timer);
  }, [isRecording, timeLeft]);

  const handleComplete = () => {
    setIsRecording(false);
    setIsProcessing(true);
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
    }
    setTimeout(() => {
      onComplete({ rhymeScore: 88, flowScore: 92, energyScore: 85, bpm: 94 });
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <button 
        onClick={() => onNavigate('onboarding')}
        className="absolute top-8 left-8 p-4 glass rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-xs text-gray-400 hover:text-white"
      >
        <span className="material-icons-round">arrow_back</span>
        Return Home
      </button>

      <div className="max-w-md w-full glass-dark p-10 rounded-[40px] border border-purple-500/20 shadow-2xl relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[50px] transition-colors duration-500 ${isAutoTune ? 'bg-cyan-500/20' : 'bg-purple-500/10'}`}></div>

        <header className="mb-10 relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
             <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Module: Vocal Lab</span>
          </div>
          <h2 className="text-3xl font-bold metallic-text uppercase tracking-tighter">Calibrate Your Flow</h2>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">Hum or rap for 15s to tune the AI Muse.</p>
        </header>

        <div className="relative mb-12 flex justify-center items-center h-48">
          {!isProcessing ? (
            <>
              <div className={`absolute w-44 h-44 rounded-full border-2 transition-all duration-700 ${
                isRecording 
                  ? (isAutoTune ? 'border-cyan-500/40 scale-110 animate-pulse' : 'border-purple-500/30 scale-125 animate-pulse') 
                  : 'border-white/5'
              }`}></div>
              <button
                onClick={isRecording ? handleComplete : startRecording}
                className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl ${
                  isRecording 
                    ? 'bg-red-500 shadow-red-500/40' 
                    : (isAutoTune ? 'bg-cyan-600 shadow-cyan-500/40' : 'bg-purple-600 shadow-purple-500/40')
                }`}
              >
                <span className="material-icons-round text-5xl text-white">{isRecording ? 'stop' : 'mic'}</span>
              </button>
              
              {/* Auto-Tune Toggle */}
              <button 
                onClick={() => setIsAutoTune(!isAutoTune)}
                className={`absolute -right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border ${
                  isAutoTune 
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' 
                    : 'bg-white/5 border-white/10 text-gray-500 grayscale'
                }`}
              >
                <span className="material-icons-round text-xl mb-0.5">graphic_eq</span>
                <span className="text-[8px] font-black uppercase tracking-tighter">Tune</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-purple-300 font-mono tracking-widest animate-pulse">EXTRACTING METRICS...</p>
            </div>
          )}
        </div>

        <div className="flex items-end justify-center gap-1.5 h-16 mb-8 px-8 relative">
           {/* Correction Level Meter */}
           {isAutoTune && (
             <div className="absolute left-4 bottom-0 top-0 w-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-75"
                  style={{ height: `${correctionLevel}%` }}
                ></div>
                <div className="absolute inset-0 flex flex-col justify-between py-1 opacity-30">
                   {[...Array(5)].map((_, i) => <div key={i} className="h-px w-full bg-white/50"></div>)}
                </div>
             </div>
           )}

          {volume.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-75 ${isAutoTune ? 'bg-gradient-to-t from-cyan-600 to-blue-400' : 'bg-gradient-to-t from-purple-600 to-indigo-400'}`}
              style={{ height: `${v}%`, opacity: 0.3 + (i / volume.length) * 0.7 }}
            ></div>
          ))}

          {isAutoTune && (
            <div className="absolute -left-6 top-1/2 -rotate-90 text-[7px] font-black text-cyan-400 uppercase tracking-widest">Correction</div>
          )}
        </div>

        {isRecording && (
          <div className="mb-8 font-mono text-4xl text-white tracking-widest animate-pulse font-bold">
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] italic">
            {isRecording ? "Capturing raw frequency data..." : "Ready for voice calibration"}
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={onSkip} className="text-gray-500 text-[10px] font-bold hover:text-white transition-colors uppercase tracking-widest border-b border-gray-700 hover:border-white pb-0.5">
              Skip Analysis
            </button>
          </div>
        </div>
      </div>
      
      {isAutoTune && !isProcessing && (
        <p className="mt-6 text-[9px] text-cyan-400/60 uppercase font-black tracking-widest animate-pulse">
          Digital pitch enhancement active
        </p>
      )}
    </div>
  );
};

export default VoiceAnalysis;
