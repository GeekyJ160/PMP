
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
  const [correctionLevel, setCorrectionLevel] = useState(0);
  const [volume, setVolume] = useState<number[]>(new Array(30).fill(5));

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const filterNode = useRef<BiquadFilterNode | null>(null);
  const requestRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream);
      
      filterNode.current = audioContext.current.createBiquadFilter();
      filterNode.current.type = 'peaking';
      filterNode.current.frequency.value = 2000;
      filterNode.current.gain.value = isAutoTune ? 15 : 0;

      source.connect(filterNode.current);
      filterNode.current.connect(analyser.current);
      
      setIsRecording(true);
      setTimeLeft(15);
      animate();
    } catch (err) {
      alert("Microphone access required.");
    }
  };

  const animate = () => {
    if (!analyser.current) return;
    const data = new Uint8Array(analyser.current.frequencyBinCount);
    analyser.current.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    setVolume(prev => [...prev.slice(1), Math.max(10, avg * 1.2)]);
    
    if (isAutoTune && avg > 15) {
      setCorrectionLevel(Math.random() * 80 + 20);
    } else {
      setCorrectionLevel(0);
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  const handleComplete = () => {
    setIsRecording(false);
    setIsProcessing(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setTimeout(() => onComplete({ rhymeScore: 85, flowScore: 90, energyScore: 80, bpm: 95 }), 2000);
  };

  useEffect(() => {
    if (filterNode.current) filterNode.current.gain.value = isAutoTune ? 15 : 0;
  }, [isAutoTune]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0F0F23]">
      <div className="max-w-md w-full glass-dark p-10 rounded-[40px] border border-purple-500/20 shadow-2xl relative overflow-hidden">
        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[50px] transition-all ${isAutoTune ? 'bg-cyan-500/20' : 'bg-purple-500/10'}`}></div>

        <header className="mb-8">
          <h2 className="text-3xl font-bold metallic-text uppercase tracking-tighter">Vocal Calibration</h2>
          <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">Record your flow for 15s</p>
        </header>

        <div className="relative mb-12 flex justify-center items-center h-48">
          {!isProcessing ? (
            <>
              <div className={`absolute w-44 h-44 rounded-full border-2 transition-all ${isRecording ? 'animate-pulse scale-110 border-purple-500/40' : 'border-white/5'}`}></div>
              <button
                onClick={isRecording ? handleComplete : startRecording}
                className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-red-500/40' : 'bg-purple-600 shadow-purple-500/40'}`}
              >
                <span className="material-icons-round text-5xl text-white">{isRecording ? 'stop' : 'mic'}</span>
              </button>
              
              <button 
                onClick={() => setIsAutoTune(!isAutoTune)}
                className={`absolute -right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all border ${isAutoTune ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
              >
                <span className="material-icons-round text-xl">graphic_eq</span>
                <span className="text-[8px] font-black uppercase">Tune</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-purple-300 font-mono tracking-widest animate-pulse">ANALYZING PHONETICS...</p>
            </div>
          )}
        </div>

        <div className="flex items-end justify-center gap-1.5 h-16 mb-8 relative">
          {isAutoTune && (
            <div className="absolute left-4 bottom-0 top-0 w-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="absolute bottom-0 left-0 right-0 bg-cyan-400 transition-all duration-75" style={{ height: `${correctionLevel}%` }}></div>
            </div>
          )}
          {volume.map((v, i) => (
            <div key={i} className={`flex-1 rounded-full ${isAutoTune ? 'bg-cyan-600' : 'bg-purple-600'}`} style={{ height: `${v}%`, opacity: 0.3 + (i / 30) }}></div>
          ))}
        </div>

        {isRecording && <div className="mb-4 text-white font-mono text-3xl">00:{timeLeft.toString().padStart(2, '0')}</div>}
        <button onClick={onSkip} className="text-gray-500 text-[10px] uppercase font-black hover:text-white">Skip Calibration</button>
      </div>
    </div>
  );
};

export default VoiceAnalysis;
