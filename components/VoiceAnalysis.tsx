
import React, { useState, useRef, useEffect } from 'react';
import { Genre } from '../types';

interface Props {
  genre: Genre;
  onComplete: (scores: { rhymeScore: number; flowScore: number; energyScore: number; bpm: number }) => void;
  onSkip: () => void;
}

const VoiceAnalysis: React.FC<Props> = ({ genre, onComplete, onSkip }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();
  const [volume, setVolume] = useState<number[]>(new Array(40).fill(5));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      const source = audioContext.current.createMediaStreamSource(stream);
      source.connect(analyser.current);
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
    
    // Average volume mapping
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setVolume(prev => {
      const next = [...prev.slice(1), Math.max(10, average * 0.8)];
      return next;
    });
    requestRef.current = requestAnimationFrame(animate);
  };

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
    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    // Simulated AI processing delay
    setTimeout(() => {
      onComplete({
        rhymeScore: 88,
        flowScore: 92,
        energyScore: 85,
        bpm: 94
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-md w-full glass-dark p-10 rounded-[40px] border border-purple-500/20 shadow-2xl relative">
        <header className="mb-10">
          <h2 className="text-3xl font-bold metallic-text uppercase tracking-tighter">Voice Your Style</h2>
          <p className="text-gray-400 mt-2">Hum, sing, or rap for 15s to calibrate your AI Muse.</p>
        </header>

        <div className="relative mb-12 flex justify-center items-center h-48">
          {!isProcessing ? (
            <>
              {/* Mic Button Circle */}
              <div className={`absolute w-40 h-40 rounded-full bg-purple-500/10 border-2 border-purple-500/30 transition-all duration-700 ${isRecording ? 'scale-125 animate-pulse' : ''}`}></div>
              <button
                onClick={isRecording ? handleComplete : startRecording}
                className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all transform active:scale-90 ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-purple-600 shadow-[0_0_30px_rgba(124,58,237,0.5)]'}`}
              >
                <span className="material-icons-round text-5xl text-white">{isRecording ? 'stop' : 'mic'}</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-purple-300 font-mono tracking-widest animate-pulse">ANALYZING CADENCE...</p>
            </div>
          )}
        </div>

        {/* Waveform Visualization */}
        <div className="flex items-end justify-center gap-1 h-12 mb-8 px-4 opacity-80">
          {volume.map((v, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-purple-600 to-blue-400 rounded-full transition-all duration-75"
              style={{ height: `${v}%` }}
            ></div>
          ))}
        </div>

        {isRecording && (
          <div className="mb-8 font-mono text-4xl text-white tracking-widest animate-pulse">
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-500 uppercase font-bold tracking-widest italic">
            {isRecording ? "Listening to your flow..." : "Ready to scan cadence"}
          </p>
          <button onClick={onSkip} className="text-gray-500 text-sm hover:text-white transition-colors underline decoration-dotted underline-offset-4">
            Skip to Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAnalysis;
