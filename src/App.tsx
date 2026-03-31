import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Square, Mic, Settings, Plus, Wand2, Download, 
  Trash2, Upload, AlignLeft, RefreshCw, Bold, Italic, List, 
  Pointer, Circle, Key, X,
  Music, Bolt, Cloud, Zap, Check, CloudUpload
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── CONSTANTS & DICTIONARIES ────────────────────────────────────

const RD: Record<string, string[]> = {
  ight: ['light', 'night', 'fight', 'right', 'might', 'tight', 'sight', 'bite', 'write', 'bright', 'flight', 'ignite', 'despite', 'invite'],
  ow: ['flow', 'glow', 'blow', 'show', 'grow', 'slow', 'throw', 'below', 'bestow', 'vertigo'],
  eat: ['beat', 'heat', 'street', 'meet', 'feat', 'sweet', 'treat', 'defeat', 'elite', 'repeat', 'compete'],
  ame: ['flame', 'game', 'name', 'same', 'fame', 'claim', 'became', 'acclaim', 'reclaim'],
  ing: ['king', 'ring', 'sing', 'bring', 'thing', 'swing', 'sting', 'spring', 'bling', 'everything'],
  ack: ['back', 'track', 'stack', 'crack', 'black', 'attack', 'setback', 'knack'],
  ine: ['line', 'shine', 'mine', 'fine', 'sign', 'design', 'divine', 'define', 'incline'],
  urn: ['turn', 'burn', 'learn', 'yearn', 'return', 'concern', 'discern'],
  un: ['run', 'gun', 'fun', 'sun', 'done', 'spun', 'outdone', 'overcome'],
  ip: ['trip', 'flip', 'grip', 'drip', 'clip', 'slip', 'chip', 'equip'],
  ash: ['cash', 'dash', 'flash', 'smash', 'crash', 'stash', 'clash'],
  and: ['land', 'stand', 'hand', 'grand', 'band', 'command', 'expand', 'demand'],
  ire: ['fire', 'wire', 'hire', 'higher', 'empire', 'desire', 'inspire', 'entire'],
  ound: ['sound', 'round', 'found', 'ground', 'bound', 'pound', 'profound', 'surround'],
  ain: ['pain', 'rain', 'gain', 'chain', 'train', 'insane', 'remain', 'explain'],
  ear: ['fear', 'near', 'clear', 'year', 'appear', 'sincere', 'frontier'],
  ake: ['take', 'make', 'break', 'shake', 'mistake', 'awake', 'forsake'],
  ell: ['hell', 'bell', 'tell', 'sell', 'spell', 'yell', 'excel', 'compel'],
  ive: ['drive', 'strive', 'arrive', 'thrive', 'survive', 'alive', 'revive'],
  old: ['cold', 'bold', 'gold', 'hold', 'unfold', 'behold', 'controlled'],
  eal: ['real', 'feel', 'deal', 'reveal', 'appeal', 'surreal', 'conceal'],
  ay: ['way', 'day', 'say', 'play', 'stay', 'display', 'betray', 'relay'],
  oom: ['room', 'bloom', 'doom', 'zoom', 'consume', 'perfume', 'assume'],
  ar: ['car', 'star', 'far', 'bar', 'scar', 'guitar', 'bizarre'],
  op: ['drop', 'stop', 'top', 'shop', 'nonstop', 'rooftop'],
};

const LOCAL_BANK = [
  "ride the wave until the city fades to smoke",
  "every lesson learned was just a different kind of broke",
  "build the empire stone by stone in dead of night",
  "they said I'd never make it now I'm burning bright",
  "the pen's a weapon and the page is where I fight",
  "move through darkness like a ghost and own the light",
  "count the miles between the dream and where I stand",
  "carve my name into the stone with my own hand",
  "nothing given freely everything was earned through pain",
  "even when the floods came I still danced in rain",
];

// ─── TYPES ───────────────────────────────────────────────────────

interface Take {
  id: string;
  name: string;
  ts: string;
  url: string;
  bpm: number;
  q: boolean;
}

// ─── UTILS ───────────────────────────────────────────────────────

function sylWord(word: string) {
  const exc: Record<string, number> = { the: 1, and: 1, for: 1, you: 1, are: 1, a: 1, i: 1, your: 1 };
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (exc[w]) return exc[w];
  let s = (w.match(/[aeiouy]+/g) || []).length;
  if (w.match(/ower|ire/)) s++;
  if (w.match(/tion|sion/)) s++;
  if (w.endsWith('e') && s > 1) s--;
  if (w.endsWith('le') && w.length > 2) s++;
  return Math.max(1, s);
}

function sylLine(line: string) {
  const matches = line.trim().match(/\b[\w']+\b/g);
  if (!matches) return 0;
  let count = 0;
  for (const w of matches) {
    count += sylWord(w);
  }
  return count;
}

function getLastWord(line: string) {
  const m = (line || '').trim().match(/\b[\w']+\b/g);
  return m ? m[m.length - 1].toLowerCase() : '';
}

function rhymes(a: string, b: string) {
  const x = (a || '').replace(/[^a-z]/gi, '').toLowerCase();
  const y = (b || '').replace(/[^a-z]/gi, '').toLowerCase();
  return x && y && (x.slice(-4) === y.slice(-4) || x.slice(-3) === y.slice(-3));
}

function getRhymeScheme(lines: string[]) {
  const ends = lines.map(l => getLastWord(l)).filter(Boolean);
  let s = '', map: Record<string, string> = {}, cc = 65;
  for (const w of ends) {
    let found = null;
    for (const k in map) {
      if (rhymes(map[k], w)) {
        found = k;
        break;
      }
    }
    if (found) s += found;
    else {
      const c = String.fromCharCode(cc++);
      map[c] = w;
      s += c;
    }
  }
  return s || '—';
}

function getSugs(word: string) {
  if (!word) return [];
  const w = word.replace(/[^a-z]/g, '');
  let out: string[] = [];
  for (const k in RD) {
    if (w.endsWith(k) || RD[k].includes(w)) {
      out = [...RD[k]];
      break;
    }
  }
  if (!out.length) {
    const t = w.slice(-3);
    for (const k in RD) {
      out.push(...RD[k].filter(x => x.endsWith(t)));
    }
  }
  return [...new Set(out)].filter(x => x !== w).slice(0, 16);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export default function App() {
  // State
  const [lyrics, setLyrics] = useState('');
  const [bpm, setBpm] = useState(90);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [takes, setTakes] = useState<Take[]>([]);
  const [beatUrl, setBeatUrl] = useState<string | null>(null);
  const [beatName, setBeatName] = useState('—');
  const [bpmSource, setBpmSource] = useState('');
  const [gridPos, setGridPos] = useState(0);
  const [isMicOn, setIsMicOn] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [rhymeSuggestions, setRhymeSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('pmp5_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const gridIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Draft
  useEffect(() => {
    const d = JSON.parse(localStorage.getItem('pmp5') || '{}');
    if (d.lyrics) setLyrics(d.lyrics);
    if (d.bpm) setBpm(d.bpm);
    if (d.beatName) setBeatName(d.beatName);
    if (d.bpmSource) setBpmSource(d.bpmSource);
    if (d.takes) setTakes(d.takes.map((t: any) => ({ ...t, url: '' })));
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, []);

  // Save Draft (Auto-save)
  useEffect(() => {
    // Don't save if it's the initial empty state
    if (!lyrics && bpm === 90 && takes.length === 0 && beatName === '—') return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('pmp5', JSON.stringify({
          lyrics,
          bpm,
          beatName,
          bpmSource,
          takes: takes.map(t => ({ name: t.name, ts: t.ts, q: t.q, bpm: t.bpm }))
        }));
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1500); // 1.5s debounce
    return () => clearTimeout(timer);
  }, [lyrics, bpm, takes, beatName, bpmSource]);

  // Metrics Calculation
  const lines = lyrics.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim());
  const wordArr = (lyrics.match(/\b[\w']+\b/g) || []);
  const totalSyl = wordArr.reduce((a, w) => a + sylWord(w), 0);
  const lineCount = nonEmptyLines.length;
  const density = wordArr.length / Math.max(1, lineCount);
  const avgSyl = totalSyl / Math.max(1, lineCount);
  const flowScore = Math.round(Math.max(0, Math.min(100, 50 + density * 6 + avgSyl * 2 - Math.abs(avgSyl - 12) * 2)));
  const rhymeScheme = lineCount > 1 ? getRhymeScheme(nonEmptyLines) : '—';

  // AI Suggestions (Local)
  useEffect(() => {
    const lastLine = nonEmptyLines[nonEmptyLines.length - 1] || '';
    if (lastLine.trim()) {
      const seed = lastLine.trim();
      const h = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 37);
      const suggestions = [0, 1, 2, 3].map(i => LOCAL_BANK[(h + i * 5) % LOCAL_BANK.length]);
      setAiSuggestions(suggestions);

      const lastWord = getLastWord(seed);
      setRhymeSuggestions(getSugs(lastWord));
    } else {
      setAiSuggestions([]);
      setRhymeSuggestions([]);
    }
  }, [lyrics]);

  // Grid Logic
  const startGrid = useCallback(() => {
    if (gridIntervalRef.current) clearInterval(gridIntervalRef.current);
    gridIntervalRef.current = window.setInterval(() => {
      setGridPos(prev => (prev + 1) % 16);
    }, (60000 / bpm) / 4);
  }, [bpm]);

  useEffect(() => {
    if (isPlaying || isRecording || beatUrl) {
      startGrid();
    } else {
      if (gridIntervalRef.current) clearInterval(gridIntervalRef.current);
      setGridPos(0);
    }
    return () => {
      if (gridIntervalRef.current) clearInterval(gridIntervalRef.current);
    };
  }, [isPlaying, isRecording, beatUrl, startGrid]);

  // Waveform Visualization
  useEffect(() => {
    if (!beatUrl || !analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      if (!analyser) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barWidth = (W / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * H;
        const t = i / bufferLength;
        const r = Math.round(60 + t * (155 - 60));
        const g = Math.round(114 + t * (255 - 114));
        const b = Math.round(255 - t * 255);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.45 + dataArray[i] / 512})`;
        ctx.fillRect(x, H - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, [beatUrl]);

  // Handlers
  const handleBeatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('audio/')) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = URL.createObjectURL(file);
    setBeatUrl(url);
    setBeatName(file.name.slice(0, 32) + (file.name.length > 32 ? '…' : ''));

    // Initialize Audio Context for Analyser
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const audio = new Audio(url);
    audio.loop = true;
    audioRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    // BPM Detection from filename
    const fnm = file.name.match(/(\d{2,3})\s?bpm/i);
    if (fnm) {
      const val = Math.max(60, Math.min(220, parseInt(fnm[1])));
      setBpm(val);
      setBpmSource('filename');
    } else {
      setBpmSource('tap to set');
    }
  };

  const togglePlay = () => {
    if (!beatUrl || !audioRef.current) {
      alert('Load a beat first');
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleRec = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const ts = new Date().toLocaleTimeString([], { timeStyle: 'short' });
        const newTake: Take = {
          id: Date.now().toString(),
          name: `Take ${takes.length + 1}`,
          ts,
          url,
          bpm,
          q: !!beatUrl
        };
        setTakes(prev => [...prev, newTake]);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access required');
    }
  };

  const tapTempo = () => {
    const now = Date.now();
    const times = tapTimesRef.current.filter(t => now - t < 3500);
    times.push(now);
    tapTimesRef.current = times;

    if (times.length >= 4) {
      const diffs = times.slice(1).map((t, i) => t - times[i]);
      const avg = diffs.reduce((a, b) => a + b) / diffs.length;
      const val = Math.round(60000 / avg);
      setBpm(val);
      setBpmSource('tap');
    }
  };

  const toggleMicBPM = async () => {
    if (isMicOn) {
      if (micIntervalRef.current) clearInterval(micIntervalRef.current);
      setIsMicOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!micCtxRef.current) {
        micCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = micCtxRef.current;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      let peaks: number[] = [];
      setIsMicOn(true);

      micIntervalRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          peak = Math.max(peak, Math.abs(data[i] - 128));
        }
        if (peak > 50) {
          const now = performance.now();
          peaks = peaks.filter(t => now - t < 3000);
          peaks.push(now);
          if (peaks.length >= 4) {
            const diffs = peaks.slice(1).map((t, i) => t - peaks[i]);
            const avg = diffs.reduce((a, b) => a + b) / diffs.length;
            setBpm(Math.round(60000 / avg));
            setBpmSource('mic');
          }
        }
      }, 80);
    } catch (err) {
      alert('Mic access needed');
    }
  };

  const runAI = async (local: boolean) => {
    if (!lyrics.trim()) return;
    setIsAiLoading(true);
    
    if (local || !apiKey) {
      await new Promise(r => setTimeout(r, 400));
      // Local suggestions already updated via useEffect
      setIsAiLoading(false);
      return;
    }

    // Cloud AI (Anthropic)
    try {
      const lastLines = nonEmptyLines.slice(-4).join('\n');
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "dangerouslyAllowBrowser": "true" // Note: This is for demo purposes in this environment
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 600,
          system: "You are a world-class rap ghostwriter. Write 5 new bar suggestions that match the flow, syllable density, and rhyme scheme of the given bars. Return ONLY a JSON array of 5 strings.",
          messages: [{ role: "user", content: `Last bars:\n${lastLines}\n\nWrite 5 continuation bars.` }]
        })
      });
      const d = await res.json();
      const raw = (d.content || []).map((b: any) => b.text || '').join('').replace(/```json|```/g, '').trim();
      let linesArr: string[] = [];
      try {
        linesArr = JSON.parse(raw);
      } catch {
        linesArr = raw.split('\n').filter(Boolean).slice(0, 5);
      }
      setAiSuggestions(linesArr);
    } catch (err) {
      console.error(err);
      alert('AI Error - check API key');
    } finally {
      setIsAiLoading(false);
    }
  };

  const appendLine = (line: string) => {
    setLyrics(prev => {
      const v = prev.trim();
      return v + (v && !v.endsWith('\n') ? '\n' : '') + line + '\n';
    });
  };

  const insertRhyme = (word: string) => {
    setLyrics(prev => {
      const words = prev.trim().split(/\s+/);
      words.push(word);
      return words.join(' ') + ' ';
    });
  };

  const clearAll = () => {
    if (confirm('Clear all lyrics and takes?')) {
      setLyrics('');
      setTakes([]);
    }
  };

  const doExport = () => {
    const d = { lyrics, bpm, takes: takes.map(t => ({ name: t.name, ts: t.ts, bpm: t.bpm, q: t.q })), saved: new Date().toISOString(), v: '5' };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
    a.download = `pmp5-${Date.now()}.json`;
    a.click();
  };

  const doLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result as string);
        if (d.lyrics) setLyrics(d.lyrics);
        if (d.bpm) setBpm(d.bpm);
        if (d.takes) setTakes(d.takes.map((t: any) => ({ ...t, url: '' })));
      } catch {
        alert('Invalid file');
      }
    };
    r.readAsText(f);
  };

  return (
    <div className="flex flex-col min-h-screen pb-32">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 backdrop-blur-md bg-bg/80">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-2xl font-black tracking-tighter bg-gradient-to-br from-[#c4a0ff] to-[#7f5aff] bg-clip-text text-transparent">
              PMP
            </div>
            <div className="text-[10px] font-medium tracking-widest text-white/20 uppercase mt-0.5">
              v5 &nbsp;•&nbsp; PRO
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              saveStatus === 'saving' ? "bg-purple animate-pulse" :
              saveStatus === 'error' ? "bg-red-accent" : "bg-teal"
            )} />
            <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'error' ? 'Save Error' : 
               `Saved ${lastSavedTime || ''}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={doExport} className="glass glass-hover w-9 h-9 rounded-xl flex items-center justify-center text-white/70">
            <Download size={16} />
          </button>
          <label className="glass glass-hover w-9 h-9 rounded-xl flex items-center justify-center text-white/70 cursor-pointer">
            <Upload size={16} />
            <input type="file" accept=".json" className="hidden" onChange={doLoad} />
          </label>
          <button 
            onClick={togglePlay} 
            className={cn("glass glass-hover w-9 h-9 rounded-xl flex items-center justify-center transition-all", isPlaying ? "bg-teal/20 border-teal/40 text-teal" : "text-white/70")}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex flex-col gap-6 sm:gap-8">
        {/* STUDIO SECTION (Beat Sync) */}
        <section id="studio">
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">Studio</div>
          <div 
            className={cn(
              "glass rounded-[26px] p-4 sm:p-[18px] relative overflow-hidden transition-all duration-300",
              beatUrl ? "shadow-[0_0_40px_rgba(155,114,255,0.18)]" : ""
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple/15 to-transparent pointer-events-none" />
            
            {!beatUrl ? (
              <div 
                onClick={() => document.getElementById('beat-upload')?.click()}
                className="border-[1.5px] border-dashed border-white/20 rounded-[18px] py-10 px-5 text-center cursor-pointer hover:border-purple/50 hover:bg-purple/10 transition-all"
              >
                <input id="beat-upload" type="file" accept="audio/*" className="hidden" onChange={handleBeatUpload} />
                <div className="text-4xl mb-3 opacity-50 flex justify-center"><Music /></div>
                <div className="text-[16px] font-bold text-white/60 mb-1">Drop beat or tap to load</div>
                <div className="text-xs text-white/40 font-medium">Supports MP3, WAV, AAC</div>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="text-xs font-semibold text-purple/90 truncate mb-2">{beatName}</div>
                <div className="flex items-end justify-between gap-2">
                  <div className="text-5xl sm:text-[56px] font-black leading-none tracking-tighter">{bpm}</div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase">BPM</div>
                    <div className="text-[10px] text-purple/80 mt-0.5 font-medium">{bpmSource}</div>
                  </div>
                </div>
                <canvas ref={canvasRef} className="w-full h-[60px] rounded-xl mt-4 bg-black/30" />
              </div>
            )}

            <div className="grid grid-cols-16 gap-[3px] mt-4">
              {Array.from({ length: 16 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-[8px] rounded-[3px] transition-all duration-75",
                    i % 4 === 0 ? "bg-white/15" : "bg-white/10",
                    gridPos === i && (isPlaying || isRecording || beatUrl) ? "bg-purple shadow-[0_0_8px_rgba(155,114,255,0.7)] scale-y-125" : ""
                  )}
                />
              ))}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 mt-4">
              <button onClick={tapTempo} className="glass glass-hover flex-1 h-11 rounded-xl text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 text-white/50 active:scale-95 transition-transform">
                <Pointer size={14} /> Tap BPM
              </button>
              <button 
                onClick={toggleMicBPM} 
                className={cn("glass glass-hover flex-1 h-11 rounded-xl text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95", isMicOn ? "bg-purple/20 border-purple/50 text-purple" : "text-white/50")}
              >
                <Mic size={14} /> {isMicOn ? 'Stop' : 'Mic'}
              </button>
              <button 
                onClick={toggleRec} 
                className={cn("glass glass-hover flex-1 h-11 rounded-xl text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95", isRecording ? "bg-red-accent/20 border-red-accent/50 text-red-accent animate-pulse" : "text-white/50")}
              >
                <Circle size={12} fill={isRecording ? "currentColor" : "none"} /> {isRecording ? 'Stop' : 'Rec'}
              </button>
            </div>
          </div>
        </section>

        {/* LYRICS EDITOR */}
        <section>
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">Lyrics</div>
          <div className="glass rounded-[26px] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 sm:px-[18px] py-4 border-b border-white/10">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <strong className="text-white/80 font-semibold">{wordArr.length}</strong> <span>words</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <strong className="text-white/80 font-semibold">{totalSyl}</strong> <span>syl</span>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold border transition-all duration-300",
                flowScore >= 85 ? "bg-hot/10 border-hot/30 text-hot" : 
                flowScore >= 65 ? "bg-teal/10 border-teal/30 text-teal" : 
                "bg-white/10 border-white/10 text-white/50"
              )}>
                Flow {flowScore} {flowScore >= 85 ? '🔥' : flowScore >= 70 ? '✨' : flowScore >= 50 ? '⚡' : ''}
              </div>
            </div>
            
            <div className="flex min-h-[280px] max-h-[400px]">
              <div className="w-10 shrink-0 py-5 text-right text-[11px] leading-[1.65] text-white/15 select-none overflow-hidden font-mono border-r border-white/5">
                {lines.map((_, i) => <div key={i} className="pr-3">{i + 1}</div>)}
              </div>
              <textarea 
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Start spittin'…&#10;&#10;Every bar a blueprint, every line a map —"
                className="flex-1 py-5 px-4 bg-transparent border-none outline-none resize-none font-sans text-[16px] leading-[1.65] text-white caret-purple placeholder:text-white/15 placeholder:italic placeholder:font-light"
              />
              <div className="w-8 shrink-0 py-5 pr-1.5 text-[10px] leading-[1.65] text-right overflow-hidden border-l border-white/5 font-mono">
                {lines.map((l, i) => {
                  const s = sylLine(l);
                  if (!l.trim()) return <div key={i} className="text-white/10">&nbsp;</div>;
                  return (
                    <div key={i} className={cn(s >= 12 ? "text-hot/70" : s >= 8 ? "text-teal/50" : "text-white/15")}>
                      {s}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* STATS DASHBOARD */}
        <section id="stats-dashboard">
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">Stats Dashboard</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass rounded-[22px] p-4 flex flex-col gap-1.5 shadow-lg">
              <div className="text-[9px] font-bold tracking-[0.16em] text-white/25 uppercase">Scheme</div>
              <div className="text-xl sm:text-[22px] font-extrabold leading-none tracking-widest text-purple truncate" title={rhymeScheme}>
                {rhymeScheme.length > 7 ? rhymeScheme.slice(0, 7) + '…' : rhymeScheme}
              </div>
            </div>
            <div className="glass rounded-[22px] p-4 flex flex-col gap-1.5 shadow-lg col-span-1 sm:col-span-1">
              <div className="text-[9px] font-bold tracking-[0.16em] text-white/25 uppercase">Flow Score</div>
              <div className="text-2xl sm:text-[28px] font-extrabold leading-none tracking-tighter">{flowScore}</div>
              <div className="h-[4px] rounded-full bg-white/10 overflow-hidden mt-2">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-teal to-purple transition-all duration-500 ease-out" 
                  style={{ width: `${flowScore}%` }} 
                />
              </div>
            </div>
            <div className="glass rounded-[22px] p-4 flex flex-col gap-1.5 shadow-lg col-span-2 sm:col-span-1">
              <div className="text-[9px] font-bold tracking-[0.16em] text-white/25 uppercase">Lines</div>
              <div className="text-2xl sm:text-[28px] font-extrabold leading-none tracking-tighter">{lineCount}</div>
            </div>
          </div>
        </section>

        {/* RHYME SUGGESTIONS */}
        <section>
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">Rhyme Suggestions</div>
          <div className="glass rounded-[26px] p-4 sm:p-[18px] shadow-lg">
            <div className="flex flex-wrap gap-2">
              {rhymeSuggestions.length > 0 ? (
                rhymeSuggestions.map((w, i) => (
                  <button 
                    key={i} 
                    onClick={() => insertRhyme(w)}
                    className="px-4 py-2 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white/75 hover:bg-purple/20 hover:border-purple/50 hover:text-white transition-all active:scale-90"
                  >
                    {w}
                  </button>
                ))
              ) : (
                <div className="text-xs text-white/20 italic py-2 w-full text-center">Write a line to see rhymes…</div>
              )}
            </div>
          </div>
        </section>

        {/* AI FLOW LINES */}
        <section>
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">AI Flow Lines</div>
          <div className="glass rounded-[26px] p-4 sm:p-[18px] relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple/10 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[14px] font-bold">Suggestions</span>
              <span className={cn(
                "text-[10px] font-bold tracking-[0.12em] px-3 py-1 rounded-full uppercase border",
                apiKey ? "bg-purple/20 border-purple/40 text-purple" : "bg-teal/15 border-teal/30 text-teal"
              )}>
                {apiKey ? 'Cloud' : 'Local'}
              </span>
            </div>

            {isAiLoading && (
              <div className="text-center text-[11px] font-bold tracking-[0.2em] text-purple uppercase py-4 animate-pulse">
                Generating…
              </div>
            )}

            <div className="flex flex-col gap-2 min-h-[60px] relative z-10">
              {aiSuggestions.length > 0 ? (
                aiSuggestions.map((l, i) => (
                  <button 
                    key={i} 
                    onClick={() => appendLine(l)}
                    className="text-left px-4 py-3 rounded-[16px] bg-white/5 border border-white/10 text-[14px] text-white/70 hover:bg-purple/15 hover:border-purple/40 hover:text-white transition-all active:scale-[0.98] leading-snug"
                  >
                    {l}
                  </button>
                ))
              ) : !isAiLoading && (
                <div className="text-xs text-white/20 italic py-3 text-center">Auto-suggests as you write. Hit Generate for more.</div>
              )}
            </div>

            <div className="flex gap-2 mt-4 relative z-10">
              <button onClick={() => runAI(true)} className="glass glass-hover flex-1 h-11 rounded-[16px] text-xs font-bold tracking-wider flex items-center justify-center gap-2 text-white/60 active:scale-95">
                <Bolt size={16} /> Local
              </button>
              <button onClick={() => runAI(false)} className="glass glass-hover flex-1 h-11 rounded-[16px] text-xs font-bold tracking-wider flex items-center justify-center gap-2 text-white/60 hover:text-teal hover:border-teal/40 hover:bg-teal/10 active:scale-95">
                <Cloud size={16} /> Cloud AI
              </button>
              <button onClick={() => setShowApiKey(!showApiKey)} className="glass glass-hover w-11 h-11 rounded-[16px] flex items-center justify-center text-white/50 active:scale-95">
                <Key size={16} />
              </button>
            </div>

            {showApiKey && (
              <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/10 flex flex-col gap-3 relative z-10 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="password" 
                  placeholder="Anthropic API key: sk-ant-…" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 text-white text-sm outline-none focus:border-purple/50 transition-all"
                />
                <button 
                  onClick={() => {
                    setApiKey(apiKeyInput);
                    localStorage.setItem('pmp5_key', apiKeyInput);
                    setShowApiKey(false);
                  }}
                  className="h-11 rounded-xl bg-gradient-to-r from-purple to-indigo text-white text-sm font-bold hover:brightness-110 transition-all active:scale-95"
                >
                  Save Key
                </button>
              </div>
            )}
          </div>
        </section>

        {/* TAKES */}
        <section>
          <div className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase px-1 mb-2.5">Takes</div>
          <div className="glass rounded-[26px] p-4 sm:p-[18px] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-bold">Recordings</span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-purple/20 border border-purple/30 text-purple">
                {takes.length}
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {takes.length > 0 ? (
                takes.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-purple/20 border border-purple/30 flex items-center justify-center text-xs font-black text-purple shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[14px] font-bold truncate">{t.name}{t.q ? ' ⚡' : ''}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 font-medium">{t.ts}{t.bpm ? ` · ${t.bpm} BPM` : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => t.url && new Audio(t.url).play()} 
                        className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center text-white/50 hover:text-purple hover:border-purple/40 hover:bg-purple/20 active:scale-90"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <button 
                        onClick={() => setTakes(prev => prev.filter(x => x.id !== t.id))}
                        className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center text-white/50 hover:text-red-accent hover:border-red-accent/40 hover:bg-red-accent/20 active:scale-90"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-white/20 italic py-6 text-center">No takes yet — hit Rec to start.</div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 w-full p-4 pb-8 bg-gradient-to-t from-bg via-bg/95 to-transparent pointer-events-none z-50">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            <button onClick={doExport} className="h-11 rounded-2xl bg-white/10 border border-white/15 text-white/60 text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-white/20 hover:text-white transition-all active:scale-95">
              <Download size={14} /> Export
            </button>
            <label className="h-11 rounded-2xl bg-white/10 border border-white/15 text-white/60 text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-white/20 hover:text-white transition-all cursor-pointer active:scale-95">
              <Upload size={14} /> Load
              <input type="file" accept=".json" className="hidden" onChange={doLoad} />
            </label>
            <button onClick={tapTempo} className="h-11 rounded-2xl bg-white/10 border border-white/15 text-white/60 text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-white/20 hover:text-white transition-all active:scale-95">
              <Pointer size={14} /> Tap
            </button>
            <button onClick={clearAll} className="h-11 rounded-2xl bg-white/10 border border-red-accent/25 text-white/60 text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-red-accent/20 hover:border-red-accent/40 hover:text-red-accent transition-all active:scale-95">
              <Trash2 size={14} /> Clear
            </button>
          </div>
          <button 
            onClick={toggleRec}
            className={cn(
              "w-full h-[58px] rounded-[22px] flex items-center justify-center gap-3 text-[16px] font-black tracking-widest uppercase transition-all duration-300 shadow-2xl",
              isRecording 
                ? "bg-gradient-to-r from-red-accent to-[#cc2244] text-white shadow-[0_0_40px_rgba(255,79,109,0.8)]" 
                : "bg-gradient-to-r from-purple via-indigo to-indigo text-white shadow-[0_0_28px_rgba(147,112,219,0.55)] hover:shadow-[0_0_40px_rgba(147,112,219,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            )}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Zap size={20} fill="currentColor" />}
            <span>{isRecording ? 'Stop Recording' : 'Record Take'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
