
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
  const [currentNote, setCurrentNote] = useState('---');
  const [volume, setVolume] = useState<number[]>(new Array(30).fill(5));

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const filterNode = useRef<BiquadFilterNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistory = useRef<{raw: number, corrected: number}[]>([]);

  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 2048;
      const source = audioContext.current.createMediaStreamSource(stream);
      
      filterNode.current = audioContext.current.createBiquadFilter();
      filterNode.current.type = 'peaking';
      filterNode.current.frequency.value = 2000;
      filterNode.current.gain.value = isAutoTune ? 15 : 0;

      source.connect(filterNode.current);
      filterNode.current.connect(analyser.current);
      
      setIsRecording(true);
      setTimeLeft(15);
      pitchHistory.current = Array(60).fill({ raw: 50, corrected: 50 });
      animate();
    } catch (err) {
      alert("Microphone access required.");
    }
  };

  const animate = () => {
    if (!analyser.current || !canvasRef.current) return;
    
    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.current.getByteFrequencyData(dataArray);
    
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setVolume(prev => [...prev.slice(1), Math.max(10, avg * 1.5)]);

    let maxVal = 0;
    let maxIndex = -1;
    for(let i=0; i < bufferLength/4; i++) { 
      if(dataArray[i] > maxVal) {
        maxVal = dataArray[i];
        maxIndex = i;
      }
    }

    if (maxVal > 40) {
      const rawY = 100 - ((maxIndex * 1.5) % 100);
      const step = 100 / notes.length;
      const correctedY = isAutoTune ? Math.round(rawY / step) * step : rawY;
      
      pitchHistory.current.push({ raw: rawY, corrected: correctedY });
      if (pitchHistory.current.length > 60) pitchHistory.current.shift();
      
      if (isAutoTune) {
        setCorrectionLevel(Math.min(100, Math.abs(rawY - correctedY) * 8));
        setCurrentNote(notes[Math.floor(maxIndex / 4) % 12]);
      }
    } else {
      pitchHistory.current.push({ raw: 50, corrected: 50 });
      if (pitchHistory.current.length > 60) pitchHistory.current.shift();
      setCurrentNote('---');
      setCorrectionLevel(0);
    }

    drawPitchGraph();
    requestRef.current = requestAnimationFrame(animate);
  };

  const drawPitchGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const history = pitchHistory.current;
    
    // Draw raw pitch line (Subtle white)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    history.forEach((p, i) => {
      const x = (i / 60) * canvas.width;
      const y = (p.raw / 100) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (isAutoTune) {
      // Draw "Snap" lines (connections between raw and corrected)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.lineWidth = 1;
      history.forEach((p, i) => {
        if (i % 3 === 0) { // Sparse vertical lines for clarity
           const x = (i / 60) * canvas.width;
           const yRaw = (p.raw / 100) * canvas.height;
           const yCorr = (p.corrected / 100) * canvas.height;
           ctx.moveTo(x, yRaw);
           ctx.lineTo(x, yCorr);
        }
      });
      ctx.stroke();

      // Draw corrected pitch line (Neon Cyan with Glow)
      ctx.beginPath();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      history.forEach((p, i) => {
        const x = (i / 60) * canvas.width;
        const y = (p.corrected / 100) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow for other drawings
    }
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
          <div className="flex justify-center items-center gap-2 mb-1">
             <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Signal Integrity: Optimal</span>
          </div>
          <h2 className="text-3xl font-bold metallic-text uppercase tracking-tighter">Vocal Calibration</h2>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-bold">Raw frequency capture enabled</p>
        </header>

        <div className="relative mb-8 flex justify-center items-center h-48">
          {!isProcessing ? (
            <>
              <div className={`absolute w-44 h-44 rounded-full border-2 transition-all ${isRecording ? 'animate-pulse scale-110 border-purple-500/40' : 'border-white/5'}`}></div>
              <button
                onClick={isRecording ? handleComplete : startRecording}
                className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 shadow-red-500/40' : 'bg-purple-600 shadow-purple-500/40'}`}
              >
                <span className="material-icons-round text-5xl text-white">{isRecording ? 'stop' : 'mic'}</span>
              </button>
              
              <div className="absolute -right-6 flex flex-col gap-2">
                <button 
                  onClick={() => setIsAutoTune(!isAutoTune)}
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all border ${isAutoTune ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400' : 'bg-white/5 border-white/10 text-gray-500'}`}
                >
                  <span className="material-icons-round text-lg">graphic_eq</span>
                  <span className="text-[7px] font-black uppercase">AutoTune</span>
                </button>
                {isAutoTune && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl py-2 px-1 text-cyan-400 animate-in fade-in zoom-in duration-300">
                    <div className="text-[10px] font-black">{currentNote}</div>
                    <div className="text-[6px] uppercase font-bold opacity-70">Key</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-purple-300 font-mono tracking-widest animate-pulse">EXTRACTING METADATA...</p>
            </div>
          )}
        </div>

        {/* Enhanced Pitch Graph Canvas */}
        <div className="relative w-full h-24 mb-4 bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-inner">
          <canvas ref={canvasRef} width={400} height={100} className="w-full h-full opacity-90" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
             <div className="w-full h-px bg-white border-t border-dashed"></div>
          </div>
          {isAutoTune && (
             <div className="absolute top-2 left-3 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping"></span>
                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest opacity-70">Correction Matrix Live</span>
             </div>
          )}
        </div>

        <div className="flex items-end justify-center gap-1.5 h-12 mb-8 relative px-4">
          {isAutoTune && (
            <div className="absolute left-0 bottom-0 top-0 w-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div className="absolute bottom-0 left-0 right-0 bg-cyan-400 transition-all duration-75 shadow-[0_0_10px_#22d3ee]" style={{ height: `${correctionLevel}%` }}></div>
            </div>
          )}
          {volume.map((v, i) => (
            <div key={i} className={`flex-1 rounded-full transition-all duration-75 ${isAutoTune ? 'bg-cyan-500' : 'bg-purple-600'}`} style={{ height: `${v}%`, opacity: 0.1 + (i / 35) }}></div>
          ))}
        </div>

        {isRecording && <div className="mb-4 text-white font-mono text-3xl tabular-nums">00:{timeLeft.toString().padStart(2, '0')}</div>}
        <button onClick={onSkip} className="text-gray-500 text-[10px] uppercase font-black hover:text-white transition-colors tracking-[0.2em]">Skip Calibration</button>
      </div>
    </div>
  );
};

export default VoiceAnalysis;
