import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Square, Mic, Settings, Plus, Wand2, Download, 
  Trash2, Upload, AlignLeft, RefreshCw, Bold, Italic, List, 
  Pointer, Circle, Key, X,
  Music, Bolt, Cloud, Zap, Check, CloudUpload,
  Metronome, Crosshair, Trash, Info, Search, Heart, Activity,
  Layers, Volume2, VolumeX, Scissors, Save, FileJson,
  ChevronRight, Sparkles, Brain, Gauge, Palette, Wind,
  BarChart3, History, Mic2, Music2, Sliders, Layout,
  Maximize2, Minimize2, Share2, HelpCircle, ChevronDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { analyzeInstrumental } from '../services/gemini';
import { io } from "socket.io-client";

const socket = io();

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── CONSTANTS & DICTIONARIES ────────────────────────────────────

const RD: Record<string, string[]> = {
  ight: ['light', 'night', 'fight', 'right', 'might', 'tight', 'sight', 'bite', 'write', 'bright', 'flight', 'ignite', 'despite', 'invite', 'reunite', 'dynamite', 'kryptonite', 'recite'],
  ow: ['flow', 'glow', 'blow', 'show', 'grow', 'slow', 'throw', 'below', 'bestow', 'vertigo', 'indigo', 'overflow', 'radio', 'studio'],
  eat: ['beat', 'heat', 'street', 'meet', 'feat', 'sweet', 'treat', 'defeat', 'elite', 'repeat', 'compete', 'concrete', 'complete', 'discrete'],
  ame: ['flame', 'game', 'name', 'same', 'fame', 'claim', 'became', 'acclaim', 'reclaim', 'proclaim', 'defame', 'maintain'],
  ing: ['king', 'ring', 'sing', 'bring', 'thing', 'swing', 'sting', 'spring', 'bling', 'everything', 'suffering', 'conquering', 'wandering'],
  ack: ['back', 'track', 'stack', 'crack', 'black', 'attack', 'setback', 'knack', 'impact', 'abstract', 'exact', 'intact'],
  ine: ['line', 'shine', 'mine', 'fine', 'sign', 'design', 'divine', 'define', 'incline', 'combine', 'confine', 'decline', 'intertwine'],
  urn: ['turn', 'burn', 'learn', 'yearn', 'return', 'concern', 'discern', 'adjourn', 'sojourn'],
  un: ['run', 'gun', 'fun', 'sun', 'done', 'spun', 'outdone', 'overcome', 'everyone', 'begun', 'undone'],
  ip: ['trip', 'flip', 'grip', 'drip', 'clip', 'slip', 'chip', 'equip', 'hardship', 'relationship'],
  ash: ['cash', 'dash', 'flash', 'smash', 'crash', 'stash', 'clash', 'backlash', 'eyelash'],
  and: ['land', 'stand', 'hand', 'grand', 'band', 'command', 'expand', 'demand', 'understand', 'withstand', 'quicksand'],
  ire: ['fire', 'wire', 'hire', 'higher', 'empire', 'desire', 'inspire', 'entire', 'admire', 'require', 'transpire'],
  ound: ['sound', 'round', 'found', 'ground', 'bound', 'pound', 'profound', 'surround', 'compound', 'resound', 'background'],
  ain: ['pain', 'rain', 'gain', 'chain', 'train', 'insane', 'remain', 'explain', 'sustain', 'contain', 'refrain', 'campaign'],
  ear: ['fear', 'near', 'clear', 'year', 'appear', 'sincere', 'frontier', 'atmosphere', 'persevere', 'pioneer', 'career'],
  ake: ['take', 'make', 'break', 'shake', 'mistake', 'awake', 'forsake', 'undertake', 'heartbreak', 'earthquake'],
  ell: ['hell', 'bell', 'tell', 'sell', 'spell', 'yell', 'excel', 'compel', 'rebel', 'propel', 'farewell'],
  ive: ['drive', 'strive', 'arrive', 'thrive', 'survive', 'alive', 'revive', 'derive', 'connive'],
  old: ['cold', 'bold', 'gold', 'hold', 'unfold', 'behold', 'controlled', 'foretold', 'stronghold'],
  eal: ['real', 'feel', 'deal', 'reveal', 'appeal', 'surreal', 'conceal', 'ordeal', 'ideal', 'zeal'],
  ay: ['way', 'day', 'say', 'play', 'stay', 'display', 'betray', 'relay', 'convey', 'decay', 'slay', 'portray', 'array'],
  oom: ['room', 'bloom', 'doom', 'zoom', 'consume', 'perfume', 'assume', 'resume', 'illume', 'mushroom'],
  ar: ['car', 'star', 'far', 'bar', 'scar', 'guitar', 'bizarre', 'avatar', 'memoir', 'bazaar'],
  ead: ['head', 'dead', 'said', 'bread', 'instead', 'ahead', 'widespread', 'thread', 'spread', 'misled'],
  ong: ['strong', 'long', 'song', 'wrong', 'belong', 'along', 'prolong', 'lifelong'],
  own: ['crown', 'down', 'town', 'drown', 'renown', 'breakdown', 'showdown', 'countdown', 'uptown'],
  ream: ['dream', 'team', 'stream', 'scheme', 'extreme', 'redeem', 'supreme', 'mainstream', 'upstream'],
  all: ['fall', 'call', 'wall', 'hall', 'stall', 'recall', 'install', 'overall', 'rainfall', 'downfall', 'freefall'],
  ife: ['life', 'knife', 'strife', 'wife', 'wildlife', 'nightlife', 'afterlife'],
  ose: ['close', 'those', 'rose', 'flows', 'shows', 'knows', 'suppose', 'disclose', 'compose', 'expose', 'propose'],
};

const LOCAL_BANKS: Record<string, string[]> = {
  default: ["ride the wave until the city fades to smoke", "every lesson learned was just a different kind of broke", "build the empire stone by stone in dead of night", "they said I'd never make it now I'm burning bright", "the pen's a weapon and the page is where I fight", "move through darkness like a ghost and own the light", "count the miles between the dream and where I stand", "carve my name into the stone with my own hand", "nothing given freely everything was earned through pain", "even when the floods came I still danced in rain", "started at the bottom now the view is looking clear", "every scar a chapter every bar a new frontier"],
  hype: ["bury competition underground six feet minimum", "built from the gutter up my legacy is delirium", "pressure make diamonds I was coal until the heat came", "real ones move in silence but you'll hear my street name", "no safety net below me when I leap from this ledge", "sharpen up my tongue and keep my mind on the edge", "they counting me out but I keep cashing the check", "woke up with a purpose now I'm crushing what's next"],
  conscious: ["metaphors cascade like rivers finding the sea", "the lexicon I carry is the air that I breathe", "paint the sky with syllables let every bar bloom", "words are ancient medicine I'm healing through the tune", "consciousness expands each time the pen meets the page", "literature and rhythm made a child called rage", "weave the tapestry of truth in iambic time", "the philosopher and poet share the same design"],
  melancholic: ["float above the melody and let the hook carry", "singing through the struggle makes the burden feel airy", "harmony inside the chaos that's where I live", "every note a gift and every bar something to give", "hook them with a feeling before the verse begins", "the chorus is the memory the verse is where it wins"],
  aggressive: ["they feed us information laced with subtle control", "wake the people up before the system takes the toll", "history repeating but the players never change", "revolution starts when we rewire the brain", "community and culture stronger than the state", "educate the youth before it's far too late"],
  chill: ["countin' up the racks until my vision get cloudy", "started from the trap now the penthouse feeling rowdy", "designer on my back and I don't check the receipt", "sauce on a hunnid slept on now I'm on repeat", "foreign whip the wrist icy never ran from beef", "loyalty a dollar and a dream is all I keep"],
  battle: ["I'm the final boss you just a glitch in the code", "step into the ring and watch the legacy unfold", "every bar a bullet every verse is a clip", "sink your battleship before it even leave the slip", "I'm the heavyweight champ you just a sparring partner", "my pen is a sword and I'm the only author"],
  melodic: ["singing to the moon until the stars align", "every single note is just a piece of my mind", "catch the rhythm let it take you away", "we can make it last forever starting today", "harmonies floating like clouds in the sky", "let the melody lift you up so high"],
  storyteller: ["it was late December when the call came through", "never thought I'd see the day the sky turned blue", "pack the bags and leave the city far behind", "searching for a piece of peace I couldn't find", "the streetlights flickered as I walked alone", "every shadow had a story of its own"]
};

// ─── TYPES ───────────────────────────────────────────────────────

interface Take {
  id: string;
  name: string;
  ts: string;
  url: string;
  bpm: number;
  q: boolean;
  preview?: string;
  punch?: boolean;
  lineIdx?: number;
  muted?: boolean;
  solo?: boolean;
}

interface AppState {
  lyrics: string;
  bpm: number;
  takes: Take[];
  aiCreativity: number;
  aiComplexity: number;
  aiMood: string;
  apiKey: string;
  beatUrl: string | null;
  beatName: string;
  beatKey: string;
  beatEnergy: number;
  beatVibe: string[];
  isPlaying: boolean;
  isRecording: boolean;
  isMetroOn: boolean;
  isPunch: boolean;
  punchLine: number;
  showOnboard: boolean;
  showKeyRow: boolean;
  
  setLyrics: (lyrics: string) => void;
  setBpm: (bpm: number) => void;
  setTakes: (takes: Take[] | ((prev: Take[]) => Take[])) => void;
  setAiCreativity: (val: number) => void;
  setAiComplexity: (val: number) => void;
  setAiMood: (val: string) => void;
  setApiKey: (val: string) => void;
  setBeatUrl: (val: string | null) => void;
  setBeatName: (val: string) => void;
  setBeatKey: (val: string) => void;
  setBeatEnergy: (val: number) => void;
  setBeatVibe: (val: string[]) => void;
  setIsPlaying: (val: boolean) => void;
  setIsRecording: (val: boolean) => void;
  setIsMetroOn: (val: boolean) => void;
  setIsPunch: (val: boolean) => void;
  setPunchLine: (val: number) => void;
  setShowOnboard: (val: boolean) => void;
  setShowKeyRow: (val: boolean) => void;
}

// ─── STORE ───────────────────────────────────────────────────────

const useStore = create<AppState>()(
  persist(
    (set) => ({
      lyrics: '',
      bpm: 120,
      takes: [],
      aiCreativity: 75,
      aiComplexity: 60,
      aiMood: 'hype',
      apiKey: '',
      beatUrl: null,
      beatName: '—',
      beatKey: '—',
      beatEnergy: 0,
      beatVibe: [],
      isPlaying: false,
      isRecording: false,
      isMetroOn: false,
      isPunch: false,
      punchLine: -1,
      showOnboard: !localStorage.getItem('pmp6_toured'),
      showKeyRow: false,

      setLyrics: (lyrics) => set({ lyrics }),
      setBpm: (bpm) => set({ bpm }),
      setTakes: (takes) => set((state) => ({ 
        takes: typeof takes === 'function' ? takes(state.takes) : takes 
      })),
      setAiCreativity: (aiCreativity) => set({ aiCreativity }),
      setAiComplexity: (aiComplexity) => set({ aiComplexity }),
      setAiMood: (aiMood) => set({ aiMood }),
      setApiKey: (apiKey) => set({ apiKey }),
      setBeatUrl: (beatUrl) => set({ beatUrl }),
      setBeatName: (beatName) => set({ beatName }),
      setBeatKey: (beatKey) => set({ beatKey }),
      setBeatEnergy: (beatEnergy) => set({ beatEnergy }),
      setBeatVibe: (beatVibe) => set({ beatVibe }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsMetroOn: (isMetroOn) => set({ isMetroOn }),
      setIsPunch: (isPunch) => set({ isPunch }),
      setPunchLine: (punchLine) => set({ punchLine }),
      setShowOnboard: (showOnboard) => set({ showOnboard }),
      setShowKeyRow: (showKeyRow) => set({ showKeyRow }),
    }),
    {
      name: 'pmp-v6-pro-storage',
      partialize: (state) => ({
        lyrics: state.lyrics,
        bpm: state.bpm,
        takes: state.takes.map(t => ({ ...t, url: '' })), // Don't persist blob URLs
        aiCreativity: state.aiCreativity,
        aiComplexity: state.aiComplexity,
        aiMood: state.aiMood,
        apiKey: state.apiKey,
        showOnboard: state.showOnboard,
      }),
    }
  )
);

// ─── UTILS ───────────────────────────────────────────────────────

function sylWord(word: string) {
  const exc: Record<string, number> = { the: 1, and: 1, for: 1, you: 1, are: 1, a: 1, i: 1, your: 1, of: 1, to: 1, in: 1, is: 1, it: 1, be: 1, or: 1, an: 1, at: 1, as: 1, by: 1 };
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (exc[w]) return exc[w];
  if (w.length <= 3) return 1;
  let s = (w.match(/[aeiouy]+/g) || []).length;
  if (w.match(/tion|sion/)) s++;
  if (w.match(/ower|ire|ier/)) s++;
  if (w.endsWith('e') && s > 1 && !w.endsWith('le')) s--;
  if (w.endsWith('le') && w.length > 3) s++;
  if (w.endsWith('es') && !w.endsWith('aes')) s = Math.max(s - 1, 1);
  if (w.endsWith('ed') && !w.match(/[td]ed$/)) s = Math.max(s - 1, 1);
  return Math.max(1, s);
}

function sylLine(line: string): number {
  const matches = line.trim().match(/\b[\w']+\b/g) || [];
  return (matches as string[]).reduce((a: number, w: string) => a + sylWord(w), 0);
}

const RhymeCore = {
  getLastWord(line: string) {
    const m = (line || '').trim().match(/\b[\w']+\b/g);
    return m ? m[m.length - 1].toLowerCase() : '';
  },
  
  getWords(text: string) {
    return (text.match(/\b[\w']+\b/g) || []).map(w => w.toLowerCase());
  },

  rhymesP(a: string, b: string) {
    const x = (a || '').replace(/[^a-z]/gi, '').toLowerCase();
    const y = (b || '').replace(/[^a-z]/gi, '').toLowerCase();
    if (!x || !y) return false;
    if (x === y) return true;
    return x.slice(-3) === y.slice(-3) || x.slice(-2) === y.slice(-2);
  },

  getScheme(lines: string[]) {
    const ends = lines.map(l => this.getLastWord(l)).filter(Boolean);
    if (!ends.length) return '—';
    let s = '', map: Record<string, string> = {}, cc = 65;
    for (const w of ends) {
      let f: string | null = null;
      for (const k in map) {
        if (this.rhymesP(map[k], w)) {
          f = k;
          break;
        }
      }
      if (f) s += f;
      else {
        const c = String.fromCharCode(cc++);
        map[c] = w;
        s += c;
      }
    }
    return s;
  },

  density(lines: string[]) {
    const ne = lines.filter(l => l.trim());
    if (ne.length < 2) return 0;
    const ends = ne.map(l => this.getLastWord(l));
    let rhyming = 0;
    for (let i = 0; i < ends.length; i++) {
      let found = false;
      for (let j = 0; j < ends.length; j++) {
        if (i !== j && this.rhymesP(ends[i], ends[j])) {
          found = true;
          break;
        }
      }
      if (found) rhyming++;
    }
    return Math.round((rhyming / ne.length) * 100);
  }
};

const FlowEngine = {
  score(raw: string) {
    const lines = raw.split('\n');
    const ne = lines.filter(l => l.trim());
    if (!ne.length) return { flow: 0, rhyme: 0, cadence: 0, words: 0, lines: 0, scheme: '—', avg: 0 };
    
    const wordArr = (raw.match(/\b[\w']+\b/g) || []) as string[];
    const totalSyl = wordArr.reduce((a: number, w: string) => a + sylWord(w), 0);
    const avg = ne.length ? Math.round(totalSyl / ne.length) : 0;
    
    const density = RhymeCore.density(ne);
    const scheme = RhymeCore.getScheme(ne);
    
    const lineSyls = ne.map(l => sylLine(l));
    const variance = lineSyls.length > 1 ? lineSyls.reduce((a, s) => a + Math.abs(s - avg), 0) / lineSyls.length : 0;
    const cadence = Math.max(0, Math.round(100 - (variance * 8)));
    
    const flow = Math.round(Math.min(100, (density * 0.4) + (cadence * 0.4) + (avg >= 8 && avg <= 14 ? 20 : 10)));
    
    return { flow, rhyme: density, cadence, words: wordArr.length, lines: ne.length, scheme, avg };
  },

  feedback(scores: any, mood: string) {
    if (!scores.lines) return "Start writing to get flow feedback.";
    if (scores.flow > 85) return "Flow is elite. Syllable density is perfect for the pocket.";
    if (scores.cadence < 60) return "Cadence is shaky. Try to match the syllable counts of your bars.";
    if (scores.rhyme < 40) return "Rhyme density is low. Try more internal or multi-syllable rhymes.";
    return `Solid ${mood} vibe. Keep the momentum going.`;
  }
};

function getEmotionalTone(text: string) {
  const t = text.toLowerCase();
  const moods = {
    hype: ['fire', 'lit', 'top', 'king', 'win', 'gold', 'bright', 'light', 'sky', 'high', 'power', 'strong'],
    aggressive: ['fight', 'war', 'blood', 'kill', 'dead', 'smoke', 'broke', 'pain', 'hard', 'cold', 'dark', 'storm'],
    melancholic: ['rain', 'ghost', 'lost', 'past', 'fast', 'tear', 'fear', 'gone', 'lone', 'sad', 'blue', 'grey'],
    conscious: ['truth', 'mind', 'soul', 'life', 'world', 'learn', 'wise', 'deep', 'real', 'know', 'think', 'see'],
    chill: ['wave', 'flow', 'slow', 'dream', 'cloud', 'drift', 'vibe', 'cool', 'calm', 'smooth', 'easy', 'rest'],
    battle: ['fight', 'clash', 'ring', 'punch', 'strike', 'beat', 'win', 'crown', 'champ', 'blood', 'glory', 'spit', 'boss', 'king'],
    melodic: ['sing', 'song', 'tune', 'note', 'voice', 'sweet', 'harm', 'choir', 'pitch', 'sound', 'chord', 'rhythm', 'moon', 'star'],
    storyteller: ['once', 'time', 'day', 'night', 'year', 'told', 'said', 'saw', 'went', 'came', 'knew', 'thought']
  };
  
  const scores: Record<string, number> = { hype: 0, aggressive: 0, melancholic: 0, conscious: 0, chill: 0, battle: 0, melodic: 0, storyteller: 0 };
  const words = t.match(/\b\w+\b/g) || [];
  for (const w of words) {
    for (const [mood, keywords] of Object.entries(moods)) {
      if (keywords.includes(w)) scores[mood as keyof typeof scores]++;
    }
  }
  const max = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a);
  return max[1] > 0 ? max[0] : 'neutral';
}

function getSugs(word: string, targetSyllables: number = 0, tone: string = 'neutral') {
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
    const t = w.slice(-2);
    for (const k in RD) {
      out.push(...RD[k].filter(x => x.endsWith(t)));
    }
  }
  
  let filtered = [...new Set(out)].filter(x => x !== w);
  
  const moods: Record<string, string[]> = {
    hype: ['fire', 'lit', 'top', 'king', 'win', 'gold', 'bright', 'light', 'sky', 'high', 'power', 'strong'],
    aggressive: ['fight', 'war', 'blood', 'kill', 'dead', 'smoke', 'broke', 'pain', 'hard', 'cold', 'dark', 'storm'],
    melancholic: ['rain', 'ghost', 'lost', 'past', 'fast', 'tear', 'fear', 'gone', 'lone', 'sad', 'blue', 'grey'],
    conscious: ['truth', 'mind', 'soul', 'life', 'world', 'learn', 'wise', 'deep', 'real', 'know', 'think', 'see'],
    chill: ['wave', 'flow', 'slow', 'dream', 'cloud', 'drift', 'vibe', 'cool', 'calm', 'smooth', 'easy', 'rest'],
    battle: ['fight', 'clash', 'ring', 'punch', 'strike', 'beat', 'win', 'crown', 'champ', 'blood', 'glory', 'spit', 'boss', 'king'],
    melodic: ['sing', 'song', 'tune', 'note', 'voice', 'sweet', 'harm', 'choir', 'pitch', 'sound', 'chord', 'rhythm', 'moon', 'star'],
    storyteller: ['once', 'time', 'day', 'night', 'year', 'told', 'said', 'saw', 'went', 'came', 'knew', 'thought']
  };
  const toneWords = moods[tone] || [];

  filtered.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Syllable matching
    const sylA = sylWord(a);
    const sylB = sylWord(b);
    scoreA -= Math.abs(sylA - targetSyllables);
    scoreB -= Math.abs(sylB - targetSyllables);
    
    // Tone matching
    if (toneWords.includes(a)) scoreA += 5;
    if (toneWords.includes(b)) scoreB += 5;
    
    return scoreB - scoreA;
  });
  return filtered.slice(0, 12);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export default function App() {
  const store = useStore();
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [rhymeSuggestions, setRhymeSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [punchlineLoading, setPunchlineLoading] = useState(false);
  const [isAnalyzingBeat, setIsAnalyzingBeat] = useState(false);
  const [punchline, setPunchline] = useState<string | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(store.apiKey);
  
  // Auto-Rhyme Assist State
  const [autoRhymes, setAutoRhymes] = useState<string[]>([]);
  const [showAutoRhymes, setShowAutoRhymes] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<{x: number, y: number} | null>(null);
  const rhymeCache = useRef<Record<string, string[]>>({});
  const currentAutoRhymeWordRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tapTimesRef = useRef<number[]>([]);
  const metroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Metrics
  const scores = FlowEngine.score(store.lyrics);
  const tone = getEmotionalTone(store.lyrics);
  const lines = store.lyrics.split('\n');

  // ─── EFFECTS ────────────────────────────────────────────────────

  useEffect(() => {
    socket.emit('join-project', 'default-project');
    socket.on('lyrics-updated', (newLyrics: string) => {
      if (newLyrics !== store.lyrics) store.setLyrics(newLyrics);
    });
    return () => {
      socket.off('lyrics-updated');
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      socket.emit('update-lyrics', { projectId: 'default-project', lyrics: store.lyrics });
    }, 500);
    return () => clearTimeout(timer);
  }, [store.lyrics]);

  useEffect(() => {
    if (store.isMetroOn && (store.isPlaying || store.isRecording)) {
      const ctx = new AudioContext();
      let nextTick = ctx.currentTime;
      const interval = 60 / store.bpm;
      metroTimerRef.current = setInterval(() => {
        while (nextTick < ctx.currentTime + 0.1) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = nextTick % (interval * 4) < 0.01 ? 880 : 440;
          g.gain.setValueAtTime(0.1, nextTick);
          g.gain.exponentialRampToValueAtTime(0.001, nextTick + 0.05);
          osc.start(nextTick); osc.stop(nextTick + 0.05);
          nextTick += interval;
        }
      }, 25);
      return () => {
        clearInterval(metroTimerRef.current!);
        ctx.close();
      };
    }
  }, [store.isMetroOn, store.isPlaying, store.isRecording, store.bpm]);

  useEffect(() => {
    const lastLine = lines.filter(l => l.trim()).pop() || '';
    if (lastLine) {
      const lastWord = RhymeCore.getLastWord(lastLine);
      const targetSyl = sylLine(lastLine);
      setRhymeSuggestions(getSugs(lastWord, targetSyl, tone));
      
      // Local AI suggestions
      const bank = LOCAL_BANKS[store.aiMood] || LOCAL_BANKS.default;
      const h = lastLine.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 37);
      setAiSuggestions([0, 1, 2].map(i => bank[(h + i * 7) % bank.length]));
    }
  }, [store.lyrics, store.aiMood]);

  // Auto-Rhyme Assist Logic
  const getCaretCoordinates = () => {
    const ta = textareaRef.current;
    if (!ta) return null;
    
    // Create a hidden div to mirror the textarea
    const div = document.createElement('div');
    const style = window.getComputedStyle(ta);
    for (const prop of style) {
      div.style.setProperty(prop, style.getPropertyValue(prop));
    }
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    
    const text = ta.value.substring(0, ta.selectionStart);
    div.textContent = text;
    
    const span = document.createElement('span');
    span.textContent = ta.value.substring(ta.selectionStart) || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const rect = span.getBoundingClientRect();
    const taRect = ta.getBoundingClientRect();
    document.body.removeChild(div);
    
    return {
      x: taRect.left + rect.left + 20, // offset
      y: taRect.top + rect.top + 30 // offset below cursor
    };
  };

  const getPreviousLineLastWord = () => {
    const ta = textareaRef.current;
    if (!ta) return null;
    const textBeforeCursor = ta.value.substring(0, ta.selectionStart);
    const linesBeforeCursor = textBeforeCursor.split('\n');
    if (linesBeforeCursor.length < 2) return null;
    const prevLine = linesBeforeCursor[linesBeforeCursor.length - 2].trim();
    if (!prevLine) return null;
    return RhymeCore.getLastWord(prevLine);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    store.setLyrics(e.target.value);
    
    const coords = getCaretCoordinates();
    if (coords) setCursorCoords(coords);
    
    const prevWord = getPreviousLineLastWord();
    if (prevWord) {
      if (prevWord !== currentAutoRhymeWordRef.current) {
        currentAutoRhymeWordRef.current = prevWord;
        
        if (rhymeCache.current[prevWord]) {
          setAutoRhymes(rhymeCache.current[prevWord]);
          setShowAutoRhymes(true);
        } else {
          // Fetch rhymes
          const targetSyl = sylLine(prevWord);
          const sugs = getSugs(prevWord, targetSyl, tone).slice(0, 10);
          if (sugs.length > 0) {
            rhymeCache.current[prevWord] = sugs;
            setAutoRhymes(sugs);
            setShowAutoRhymes(true);
          } else {
            setShowAutoRhymes(false);
          }
        }
      } else {
        setShowAutoRhymes(true);
      }
    } else {
      setShowAutoRhymes(false);
      currentAutoRhymeWordRef.current = null;
    }
  };

  const insertAutoRhyme = (rhyme: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const newText = text.substring(0, start) + rhyme + text.substring(end);
    store.setLyrics(newText);
    setShowAutoRhymes(false);
    
    // Restore cursor position after state update
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + rhyme.length, start + rhyme.length);
    }, 0);
  };

  // ─── HANDLERS ───────────────────────────────────────────────────

  const handlePlay = () => {
    if (!store.beatUrl) return;
    if (store.isPlaying) {
      audioRef.current?.pause();
      store.setIsPlaying(false);
    } else {
      audioRef.current?.play();
      store.setIsPlaying(true);
    }
  };

  const handleRecord = async () => {
    if (store.isRecording) {
      mediaRecorderRef.current?.stop();
      store.setIsRecording(false);
      store.setIsPlaying(false);
      audioRef.current?.pause();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = e => chunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const newTake: Take = {
            id: Date.now().toString(),
            name: `Take ${store.takes.length + 1}`,
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            url,
            bpm: store.bpm,
            q: !!store.beatUrl
          };
          store.setTakes(prev => [newTake, ...prev]);
        };
        mediaRecorderRef.current.start();
        store.setIsRecording(true);
        if (store.beatUrl) {
          audioRef.current?.play();
          store.setIsPlaying(true);
        }
      } catch (err) {
        console.error("Mic error", err);
      }
    }
  };

  const handleBeatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      store.setBeatUrl(url);
      store.setBeatName(file.name);
      
      // Auto-detect BPM from filename initially
      const match = file.name.match(/(\d{2,3})\s?bpm/i);
      if (match) store.setBpm(parseInt(match[1]));

      if (!store.apiKey) {
        store.setShowKeyRow(true);
        return; // Skip analysis if no API key
      }

      setIsAnalyzingBeat(true);
      
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const mimeMap: Record<string, string> = {
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'm4a': 'audio/aac',
          'aac': 'audio/aac',
          'ogg': 'audio/ogg',
          'flac': 'audio/flac',
          'aif': 'audio/aiff',
          'aiff': 'audio/aiff'
        };
        mimeType = mimeMap[ext || ''] || 'audio/mpeg';
      }

      const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      };

      try {
        const base64Audio = await readFileAsBase64(file);
        const analysis = await analyzeInstrumental(base64Audio, mimeType, store.apiKey);
        
        if (analysis) {
          if (analysis.bpm) store.setBpm(analysis.bpm);
          if (analysis.key) store.setBeatKey(analysis.key);
          if (analysis.energy) store.setBeatEnergy(analysis.energy);
          if (analysis.vibe) store.setBeatVibe(analysis.vibe);
        }
      } catch (err) {
        console.error("Audio processing failed:", err);
      } finally {
        setIsAnalyzingBeat(false);
      }
    }
  };

  const handleAiGen = async () => {
    if (!store.apiKey) {
      store.setShowKeyRow(true);
      return;
    }
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: store.apiKey });
      
      const personaDescriptions: Record<string, string> = {
        battle: "aggressive, witty, and highly technical. Focus on heavy punchlines, double entendres, and relentless rhythmic variety.",
        conscious: "socially aware, poetic, and thought-provoking. Focus on deep metaphors, societal critique, and intricate storytelling.",
        melodic: "infectious, relatable, and melodically driven. Focus on catchy imagery, universal emotional hooks, and simple but effective rhyme schemes.",
        hype: "energetic, club-ready, and boastful. Focus on rhythm, repetitive hooks, and feel-good, escapist themes.",
        storyteller: "narrative-driven and vivid. Focus on painting clear pictures, developing characters, and building suspense.",
        chill: "smooth, laid-back, and atmospheric. Focus on effortless flows, subtle wordplay, and a relaxed vibe.",
        aggressive: "raw, intense, and unfiltered. Focus on hard-hitting syllables, dark imagery, and commanding presence.",
        melancholic: "emotional, vulnerable, and introspective. Focus on heartbreak, deep thoughts, and powerful imagery."
      };

      const prompt = `You are a world-class ghostwriter. 
      Your Persona: ${personaDescriptions[store.aiMood] || store.aiMood}.
      Creativity Level: ${store.aiCreativity}/100 (higher means more abstract/unique).
      Complexity Level: ${store.aiComplexity}/100 (higher means more multi-syllabic rhymes and advanced vocabulary).
      
      Current Lyrics:
      "${store.lyrics.slice(-800)}"
      
      TASK: 
      1. Deeply analyze the thematic progression, emotional arc, and rhyme schemes of the current lyrics.
      2. Write 4 bars of continuation lyrics that perfectly match the requested persona, creativity, and complexity. 
      3. The continuation MUST logically and contextually follow the previous lines, building upon the established themes or introducing a meaningful twist.
      
      Return ONLY the lyrics, one bar per line. Do not include any other text, analysis, or conversational filler.`;
      
      const temperature = 0.3 + (store.aiCreativity / 100) * 0.9; // 0.3 to 1.2
      const topP = 0.7 + (store.aiComplexity / 100) * 0.25; // 0.7 to 0.95

      const res = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          temperature,
          topP
        }
      });
      const text = res.text || '';
      const bars = text.split('\n').filter(l => l.trim()).slice(0, 4);
      setAiSuggestions(bars);
    } catch (err) {
      console.error("AI Error", err);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePunchlineGen = async () => {
    if (!store.apiKey) {
      store.setShowKeyRow(true);
      return;
    }
    setPunchlineLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: store.apiKey });
      
      const personaDescriptions: Record<string, string> = {
        battle: "aggressive, witty, and highly technical. Focus on heavy punchlines, double entendres, and relentless rhythmic variety.",
        conscious: "socially aware, poetic, and thought-provoking. Focus on deep metaphors, societal critique, and intricate storytelling.",
        melodic: "infectious, relatable, and melodically driven. Focus on catchy imagery, universal emotional hooks, and simple but effective rhyme schemes.",
        hype: "energetic, club-ready, and boastful. Focus on rhythm, repetitive hooks, and feel-good, escapist themes.",
        storyteller: "narrative-driven and vivid. Focus on painting clear pictures, developing characters, and building suspense.",
        chill: "smooth, laid-back, and atmospheric. Focus on effortless flows, subtle wordplay, and a relaxed vibe.",
        aggressive: "raw, intense, and unfiltered. Focus on hard-hitting syllables, dark imagery, and commanding presence.",
        melancholic: "emotional, vulnerable, and introspective. Focus on heartbreak, deep thoughts, and powerful imagery."
      };

      const prompt = `You are a world-class ghostwriter. 
      Your Persona: ${personaDescriptions[store.aiMood] || store.aiMood}.
      Creativity Level: ${store.aiCreativity}/100 (higher means more abstract/unique).
      Complexity Level: ${store.aiComplexity}/100 (higher means more multi-syllabic rhymes and advanced vocabulary).
      
      Current Lyrics:
      "${store.lyrics.slice(-800)}"
      
      TASK: 
      1. Deeply analyze the thematic progression and context of the current lyrics.
      2. Based on this analysis, generate ONE extremely clever, contextually relevant, high-impact punchline or piece of wordplay.
      3. The punchline must fit seamlessly with the current themes, mood, and style.
      
      Return ONLY the punchline text. No explanations, no quotes, no extra characters.`;
      
      const temperature = 0.3 + (store.aiCreativity / 100) * 0.9; // 0.3 to 1.2
      const topP = 0.7 + (store.aiComplexity / 100) * 0.25; // 0.7 to 0.95

      const res = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          temperature,
          topP
        }
      });
      const text = res.text?.trim() || '';
      if (text) {
        setPunchline(text);
        setTimeout(() => setPunchline(null), 8000);
      }
    } catch (err) {
      console.error("Punchline AI Error", err);
    } finally {
      setPunchlineLoading(false);
    }
  };

  const tapTempo = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const diffs = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      store.setBpm(Math.round(60000 / avg));
    }
  };

  const personaName = () => {
    const moods: any = { hype: 'Stunner', aggressive: 'Vandal', melancholic: 'Ghost', conscious: 'Sage', chill: 'Wave', battle: 'Gladiator', melodic: 'Siren', storyteller: 'Bard' };
    const prefix = store.aiCreativity > 80 ? 'Abstract ' : store.aiComplexity > 80 ? 'Intricate ' : '';
    return `${prefix}${moods[store.aiMood] || 'Writer'}`;
  };

  // ─── RENDER ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-[#e0e0e8] font-sans selection:bg-purple/30 overflow-hidden">
      
      {/* ─── HEADER ────────────────────────────────────────────────── */}
      <header className="h-16 flex shrink-0 items-center justify-between px-4 lg:px-6 bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => store.setShowOnboard(true)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple to-indigo flex items-center justify-center shadow-lg shadow-purple/20 shrink-0">
              <Zap size={16} className="text-white fill-white/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm lg:text-lg font-black tracking-tighter leading-none">PMP <span className="text-purple">PRO</span></span>
              <span className="text-[7px] lg:text-[8px] font-bold tracking-[0.2em] text-white/20 uppercase whitespace-nowrap">v6.0.4 · STUDIO</span>
            </div>
          </div>
          
          <div className="hidden sm:block h-6 w-[1px] bg-white/10 mx-1 lg:mx-2" />
          
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(60,255,216,0.5)]" />
            <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase whitespace-nowrap">Engine Online</span>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={() => store.setShowKeyRow(!store.showKeyRow)} className={cn("p-2 rounded-lg transition-all", store.apiKey ? "text-teal bg-teal/10" : "text-white/20 hover:text-white/40")}>
              <Key size={18} />
            </button>
            <button className="p-2 text-white/20 hover:text-white/40 transition-all">
              <Settings size={18} />
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-white/10 mx-1" />
          
          <button onClick={handlePlay} className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
            store.isPlaying ? "bg-teal text-black" : "bg-white text-black hover:bg-white/90"
          )}>
            {store.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative">
        
        {/* LEFT RAIL: STUDIO TOOLS */}
        <aside className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/20 backdrop-blur-md flex flex-col lg:overflow-y-auto custom-scrollbar">
          <div className="p-4 lg:p-6 space-y-8">
            
            {/* BEAT ENGINE */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Beat Engine</h3>
                {isAnalyzingBeat ? (
                  <span className="w-2 h-2 rounded-full bg-purple animate-ping"></span>
                ) : (
                  <Music2 size={12} className="text-white/10" />
                )}
              </div>
              
              <div className="glass rounded-2xl p-4 space-y-4">
                {!store.beatUrl ? (
                  <label 
                    htmlFor="beat-up"
                    className={cn(
                      "relative block border-2 border-dashed rounded-2xl py-12 px-4 text-center cursor-pointer transition-all group overflow-hidden",
                      isAnalyzingBeat ? "border-purple bg-purple/10" : "border-white/20 hover:border-purple/60 hover:bg-purple/5"
                    )}
                  >
                    <input id="beat-up" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" className="hidden" onChange={handleBeatUpload} disabled={isAnalyzingBeat} />
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-purple/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-2xl shadow-purple/10">
                        <CloudUpload size={32} className={cn("transition-colors", isAnalyzingBeat ? "text-purple animate-bounce" : "text-purple/60 group-hover:text-purple")} />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-black text-white uppercase tracking-[0.15em]">
                          {isAnalyzingBeat ? "Analyzing Audio..." : "Upload Instrumental"}
                        </div>
                        <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                          Drag & Drop or Click to Browse
                        </div>
                      </div>

                      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple/20 group-hover:brightness-110 transition-all">
                        {isAnalyzingBeat ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                        Select File
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-lg relative border-2 border-white/10", store.isPlaying ? "animate-spin" : "")} style={{ animationDuration: "3s", background: "conic-gradient(from 0deg, #111, #333, #111)" }}>
                           <div className="w-10 h-10 absolute inset-0 rounded-full opacity-50" style={{ background: "repeating-radial-gradient(circle, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)" }} />
                           <div className="w-3 h-3 bg-purple/80 rounded-full border border-black z-10 shadow-[0_0_10px_purple]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-0.5">Active Track</div>
                          <div className="text-xs font-black text-white truncate max-w-[120px]">{store.beatName}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => store.setBeatUrl(null)} 
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all"
                        title="Remove Beat"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-end gap-3 bg-gradient-to-br from-white/5 to-white/0 p-4 rounded-2xl border border-white/5 shadow-inner">
                      <div className="flex flex-col">
                        <div className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple to-teal">{store.bpm}</div>
                        <div className="text-[9px] font-bold text-white/30 uppercase mt-1 tracking-widest">BPM</div>
                      </div>
                      <div className="w-[1px] h-10 bg-white/10 mx-2" />
                      {store.beatKey !== '—' && (
                        <div className="flex flex-col">
                          <div className="text-3xl font-black tracking-tighter text-white">{store.beatKey}</div>
                          <div className="text-[9px] font-bold text-white/30 uppercase mt-1 tracking-widest">KEY</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={tapTempo} className="h-9 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all">Tap</button>
                      <button onClick={() => store.setIsMetroOn(!store.isMetroOn)} className={cn("h-9 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", store.isMetroOn ? "bg-purple/20 border-purple/40 text-purple" : "bg-white/5 border-white/5 text-white/40")}>Metro</button>
                    </div>

                    <label htmlFor="beat-up-change" className="block">
                      <input id="beat-up-change" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" className="hidden" onChange={handleBeatUpload} disabled={isAnalyzingBeat} />
                      <div className="w-full h-9 rounded-xl border border-white/10 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white cursor-pointer transition-all">
                        <RefreshCw size={12} className={isAnalyzingBeat ? "animate-spin" : ""} />
                        {isAnalyzingBeat ? "Analyzing..." : "Change Instrumental"}
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </section>

            {/* RECORDINGS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Takes</h3>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-white/40">{store.takes.length}</span>
              </div>
              
              <div className="space-y-2">
                {store.takes.length === 0 ? (
                  <div className="text-[10px] text-white/10 italic text-center py-4">No takes recorded.</div>
                ) : (
                  store.takes.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="glass p-3 rounded-xl flex items-center gap-3 group hover:border-white/20 transition-all">
                      <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/20">{store.takes.length - i}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold truncate">{t.name}</div>
                        <div className="text-[8px] text-white/20 uppercase">{t.ts}</div>
                      </div>
                      <button onClick={() => t.url && new Audio(t.url).play()} className="w-6 h-6 rounded-lg bg-purple/10 text-purple flex items-center justify-center hover:bg-purple/20"><Play size={10} fill="currentColor" /></button>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* FLOW COACH */}
            <section className="mt-auto pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(60,255,216,0.5)] animate-pulse" />
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Flow Coach</h3>
              </div>
              <div className="text-[11px] leading-relaxed text-white/50 italic bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                "{FlowEngine.feedback(scores, store.aiMood)}"
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                  <span>Pocket Lock</span>
                  <span className={scores.flow > 80 ? "text-purple" : "text-white/60"}>{scores.flow}%</span>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-purple via-teal to-purple transition-all duration-1000 ease-out" style={{ width: `${scores.flow}%` }} />
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* CENTER: EDITOR */}
        <main className="w-full shrink-0 lg:flex-1 flex flex-col relative bg-black/40 min-h-[60vh] lg:min-h-0">
          
          {/* EDITOR TOOLBAR */}
          <div className="h-auto lg:h-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 lg:px-8 lg:py-0 border-b border-white/5 bg-black/20 gap-3 lg:gap-0 shrink-0">
            <div className="flex items-center justify-between sm:justify-start gap-4 lg:gap-6 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 scrollbar-hide">
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Flow</span>
                  <span className={cn("text-xs font-black", scores.flow > 80 ? "text-hot" : "text-white")}>{scores.flow}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Rhyme</span>
                  <span className="text-xs font-black text-purple">{scores.rhyme}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Cadence</span>
                  <span className="text-xs font-black text-teal">{scores.cadence}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 shrink-0">
              <label htmlFor="beat-up-header" className="cursor-pointer shrink-0">
                <input id="beat-up-header" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" className="hidden" onChange={handleBeatUpload} disabled={isAnalyzingBeat} />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                  <Upload size={14} className="text-white/40 group-hover:text-purple transition-colors" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">
                    {isAnalyzingBeat ? "Analyzing..." : "Upload Audio"}
                  </span>
                </div>
              </label>
              <div className="hidden sm:block h-4 w-[1px] bg-white/10 shrink-0" />
              <div className="flex shrink-0 items-center gap-2 lg:gap-3 bg-white/5 pl-1.5 pr-3 lg:pr-4 py-1 rounded-full border border-white/5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple/30 to-teal/30 flex items-center justify-center shadow-lg">
                   {tone === 'hype' && <Zap size={10} className="text-white" />}
                   {tone === 'aggressive' && <Bolt size={10} className="text-white" />}
                   {tone === 'melancholic' && <Wind size={10} className="text-white" />}
                   {tone === 'conscious' && <Brain size={10} className="text-white" />}
                   {tone === 'chill' && <Cloud size={10} className="text-white" />}
                   {tone === 'battle' && <Crosshair size={10} className="text-white" />}
                   {tone === 'melodic' && <Music size={10} className="text-white" />}
                   {tone === 'storyteller' && <Layers size={10} className="text-white" />}
                   {tone === 'neutral' && <Activity size={10} className="text-white" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none mb-0.5">Tone</span>
                  <span className="text-[10px] font-black capitalize text-white leading-none">{tone}</span>
                </div>
              </div>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Words</span>
                <span className="text-xs font-black">{scores.words}</span>
              </div>
            </div>
          </div>

          {/* LYRICS AREA */}
          <div className="flex-1 relative flex overflow-hidden bg-black/20">
            <div className="absolute inset-0 pointer-events-none flex justify-center items-center opacity-20 overflow-hidden mix-blend-screen">
              <div className={cn(
                "w-[800px] h-[800px] rounded-full blur-[120px] transition-colors duration-[3000ms]", 
                tone === 'hype' || tone === 'aggressive' || tone === 'battle' ? "bg-purple/40" : 
                tone === 'melancholic' || tone === 'chill' || tone === 'melodic' ? "bg-teal/30" : 
                "bg-indigo/30"
              )} />
            </div>

            <div className="w-12 shrink-0 flex flex-col py-8 text-right pr-4 text-[11px] font-mono text-white/10 select-none border-r border-white/5 relative z-10">
              {lines.map((_, i) => <div key={i} className="h-[1.65rem]">{i + 1}</div>)}
            </div>
            
            <textarea 
              ref={textareaRef}
              value={store.lyrics}
              onChange={handleTextareaChange}
              onClick={() => {
                const coords = getCaretCoordinates();
                if (coords) setCursorCoords(coords);
              }}
              onKeyUp={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  const coords = getCaretCoordinates();
                  if (coords) setCursorCoords(coords);
                }
              }}
              placeholder="Every bar a blueprint, every line a map..."
              className="flex-1 bg-transparent py-8 px-6 outline-none resize-none font-sans text-lg leading-[1.65rem] text-white/90 placeholder:text-white/5 placeholder:italic relative z-10"
              spellCheck={false}
            />

            <div className="w-12 shrink-0 flex flex-col py-8 pl-4 text-[10px] font-mono text-white/10 select-none border-l border-white/5">
              {lines.map((l, i) => {
                const s = sylLine(l);
                return <div key={i} className={cn("h-[1.65rem]", s > 12 ? "text-hot/40" : s > 0 ? "text-white/20" : "")}>{s || ''}</div>;
              })}
            </div>
          </div>

          {/* AUTO-RHYME SUGGESTIONS (NEAR CURSOR) */}
          <AnimatePresence>
            {showAutoRhymes && autoRhymes.length > 0 && cursorCoords && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{ left: cursorCoords.x, top: cursorCoords.y }}
                className="fixed flex flex-col gap-1 p-2 bg-[#121226]/95 backdrop-blur-xl border border-purple/30 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
              >
                <div className="text-[9px] font-black text-purple uppercase tracking-widest px-2 pb-1 border-b border-white/5 mb-1">
                  Auto-Rhyme
                </div>
                {autoRhymes.map((rhyme, i) => (
                  <button 
                    key={i} 
                    onClick={() => insertAutoRhyme(rhyme)}
                    className="px-3 py-1.5 rounded-lg text-left text-xs font-bold text-white/70 hover:bg-purple/20 hover:text-white transition-all"
                  >
                    {rhyme}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* RHYME SUGGESTIONS (FLOATING) */}
          <AnimatePresence>
            {rhymeSuggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 max-w-2xl px-6 py-4 glass rounded-3xl shadow-2xl z-40"
              >
                {rhymeSuggestions.map((w, i) => (
                  <button 
                    key={i} 
                    onClick={() => store.setLyrics(store.lyrics.trim() + ' ' + w + ' ')}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:bg-purple/20 hover:border-purple/40 hover:text-white transition-all active:scale-90"
                  >
                    {w}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* PUNCHLINE NOTIFICATION */}
          <AnimatePresence>
            {punchline && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-w-xl px-8 py-5 bg-[#1E1E38]/95 backdrop-blur-xl border border-teal/40 rounded-3xl shadow-[0_0_30px_rgba(60,255,216,0.15)] z-50"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bolt size={14} className="text-teal" />
                  <span className="text-[10px] font-black text-teal uppercase tracking-widest">Punchline Generated</span>
                </div>
                <div className="text-sm font-bold text-white text-center leading-relaxed">
                  "{punchline}"
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={() => {
                      store.setLyrics(store.lyrics.trim() + '\n' + punchline + '\n');
                      setPunchline(null);
                    }}
                    className="px-4 py-1.5 rounded-full bg-teal/20 text-teal text-[10px] font-bold uppercase tracking-widest hover:bg-teal/30 transition-all"
                  >
                    Insert
                  </button>
                  <button 
                    onClick={() => setPunchline(null)}
                    className="px-4 py-1.5 rounded-full bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* RIGHT RAIL: AI PERSONA & SUGGESTIONS */}
        <aside className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-black/20 backdrop-blur-md flex flex-col lg:overflow-y-auto custom-scrollbar pb-8 lg:pb-0">
          <div className="p-4 lg:p-6 space-y-8">
            
            {/* AI PERSONA */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">AI Persona</h3>
                <button onClick={() => setShowAiSettings(!showAiSettings)} className="text-white/20 hover:text-white/40 transition-all">
                  <Sliders size={14} />
                </button>
              </div>

              <div className="glass rounded-2xl p-5 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Brain size={48} className="text-purple" />
                </div>
                
                <div className="relative z-10">
                  <div className="text-xs font-bold text-purple uppercase tracking-widest mb-1">Active Ghostwriter</div>
                  <div className="text-2xl font-black tracking-tighter">{personaName()}</div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <span>Creativity</span>
                      <span>{store.aiCreativity}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={store.aiCreativity} 
                      onChange={(e) => store.setAiCreativity(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-full appearance-none accent-purple cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <span>Complexity</span>
                      <span>{store.aiComplexity}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={store.aiComplexity} 
                      onChange={(e) => store.setAiComplexity(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-full appearance-none accent-teal cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Muse / Persona</div>
                    <div className="relative group/muse">
                      <div className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-3 px-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group-hover/muse:border-purple/50">
                        <span className="text-xs font-black tracking-widest uppercase">
                          {[
                            { id: 'battle', label: '🥊 Battle Rapper' },
                            { id: 'conscious', label: '👁️ Conscious Lyricist' },
                            { id: 'melodic', label: '🌊 Melodic Flow' },
                            { id: 'storyteller', label: '📖 Storyteller' },
                            { id: 'aggressive', label: '🔥 Aggressive' },
                            { id: 'melancholic', label: '🌧️ Melancholic' },
                            { id: 'chill', label: '🧊 Chill' },
                            { id: 'hype', label: '⚡ Hype' }
                          ].find(m => m.id === store.aiMood)?.label || 'Writer'}
                        </span>
                        <ChevronDown size={16} className="text-white/40" />
                      </div>
                      
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-xl overflow-hidden opacity-0 invisible group-hover/muse:opacity-100 group-hover/muse:visible transition-all duration-200 z-50 shadow-2xl">
                        {[
                          { id: 'battle', label: '🥊 Battle Rapper', creativity: 85, complexity: 95 },
                          { id: 'conscious', label: '👁️ Conscious Lyricist', creativity: 80, complexity: 85 },
                          { id: 'melodic', label: '🌊 Melodic Flow', creativity: 50, complexity: 35 },
                          { id: 'storyteller', label: '📖 Storyteller', creativity: 90, complexity: 85 },
                          { id: 'aggressive', label: '🔥 Aggressive', creativity: 60, complexity: 80 },
                          { id: 'melancholic', label: '🌧️ Melancholic', creativity: 85, complexity: 65 },
                          { id: 'chill', label: '🧊 Chill', creativity: 55, complexity: 45 },
                          { id: 'hype', label: '⚡ Hype', creativity: 70, complexity: 55 }
                        ].map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              store.setAiMood(m.id);
                              store.setAiCreativity(m.creativity);
                              store.setAiComplexity(m.complexity);
                            }}
                            className={cn(
                              "px-4 py-3 text-xs font-black tracking-widest uppercase cursor-pointer transition-colors flex items-center justify-between",
                              store.aiMood === m.id ? "bg-purple/20 text-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span>{m.label}</span>
                            {store.aiMood === m.id && <div className="w-1.5 h-1.5 rounded-full bg-purple shadow-[0_0_8px_rgba(168,85,247,0.5)]" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AI SUGGESTIONS */}
            <section className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Ghostwriter Bars</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePunchlineGen} 
                    disabled={punchlineLoading}
                    className="flex-1 py-3 px-2 rounded-xl bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Bolt size={14} className={punchlineLoading ? "animate-pulse" : ""} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{punchlineLoading ? 'Generating...' : 'Punchline'}</span>
                  </button>
                  <button 
                    onClick={handleAiGen} 
                    disabled={aiLoading}
                    className="flex-1 py-3 px-2 rounded-xl bg-purple/20 text-purple border border-purple/30 hover:bg-purple/30 hover:border-purple/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.15)] group"
                  >
                    {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} className="group-hover:animate-bounce" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">{aiLoading ? 'Writing...' : 'Generate Bars'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {aiSuggestions.map((bar, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", bounce: 0.4 }}
                    onClick={() => store.setLyrics(store.lyrics.trim() + '\n' + bar + '\n')}
                    className="group relative overflow-hidden p-[1px] rounded-2xl cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple/40 to-teal/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative bg-black/60 backdrop-blur-xl p-4 rounded-2xl text-xs leading-relaxed text-white/70 group-hover:text-white transition-colors border border-white/5 group-hover:border-transparent">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:rotate-180 duration-500">
                        <Plus size={14} className="text-purple" />
                      </div>
                      <div className="pr-6 font-medium">"{bar}"</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* ─── FOOTER PLAYER ────────────────────────────────────────── */}
      <footer className="h-auto lg:h-24 flex-col lg:flex-row py-6 lg:py-0 bg-gradient-to-t from-black flex-shrink-0 to-black/60 backdrop-blur-3xl border-t border-white/5 px-4 lg:px-8 flex items-center justify-between z-50 relative overflow-hidden gap-6 lg:gap-0">
        {store.isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple via-teal to-purple animate-pulse" />
        )}
        
        <div className="flex items-center justify-between lg:justify-start gap-4 lg:gap-6 w-full lg:w-1/3 relative z-10">
          <div className="flex items-center gap-4">
            <div className={cn("w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shrink-0", store.isPlaying ? "bg-gradient-to-br from-purple to-indigo animate-pulse border-transparent" : "bg-white/5")}>
              <Music size={20} className={store.isPlaying ? "text-white" : "text-white/40"} />
            </div>
            <div className="flex flex-col">
              <span className={cn("text-[8px] lg:text-[10px] font-bold uppercase tracking-widest mb-0.5 lg:mb-1 transition-colors", store.isPlaying ? "text-purple" : "text-white/20")}>Active Beat</span>
              <span className="text-xs lg:text-sm font-black truncate w-32 sm:w-48 lg:max-w-[200px]">{store.beatName}</span>
            </div>
          </div>
          <div className="hidden lg:block h-8 w-[1px] bg-white/5 shrink-0" />
          <div className="flex flex-col text-right lg:text-left shrink-0">
            <span className="text-[8px] lg:text-[10px] font-bold text-white/20 uppercase tracking-widest mb-0.5 lg:mb-1">Tempo</span>
            <span className="text-xs lg:text-sm font-black">{store.bpm} <span className="text-[8px] lg:text-[10px] text-white/40 font-bold">BPM</span></span>
          </div>
        </div>

        <div className="flex items-center gap-6 lg:gap-8 relative z-10 justify-center w-full lg:w-auto order-first lg:order-none">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all"><History size={18} /></button>
          
          <div className="relative">
            {store.isPlaying && (
              <div className="absolute inset-0 rounded-2xl bg-white blur-xl opacity-20 animate-pulse" />
            )}
            <button onClick={handlePlay} className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-3xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl z-10 border border-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-200" />
              {store.isPlaying ? <Pause size={24} lg:size={28} fill="currentColor" className="relative z-10 delay-75" /> : <Play size={24} lg:size={28} className="relative z-10 ml-1" fill="currentColor" />}
            </button>
          </div>
          
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all"><Maximize2 size={18} /></button>
        </div>

        <div className="flex items-center justify-center lg:justify-end gap-4 w-full lg:w-1/3 relative z-10">
          <button 
            onClick={handleRecord}
            className={cn(
              "h-12 lg:h-14 px-6 lg:px-8 w-full lg:w-auto rounded-2xl flex items-center justify-center gap-3 text-xs lg:text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl relative overflow-hidden",
              store.isRecording ? "text-white border-transparent" : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            {store.isRecording && (
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-500 animate-pulse" />
            )}
            <div className="relative z-10 flex items-center gap-2 lg:gap-3">
               <Mic size={18} className={store.isRecording ? "text-white animate-bounce" : ""} fill={store.isRecording ? "currentColor" : "none"} />
               {store.isRecording ? 'Recording...' : 'Record'}
            </div>
          </button>
        </div>
      </footer>

      {/* ─── MODALS ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {store.showKeyRow && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md glass-strong rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple/20 flex items-center justify-center text-purple">
                    <Key size={20} />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">API Configuration</h2>
                </div>
                <button onClick={() => store.setShowKeyRow(false)} className="text-white/20 hover:text-white"><X size={20} /></button>
              </div>
              
              <p className="text-sm text-white/40 leading-relaxed">
                Connect your Gemini API key to unlock the cloud-based Ghostwriter engine for advanced lyric generation and analysis.
              </p>

              <div className="space-y-4">
                <input 
                  type="password" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your API key..."
                  className="w-full h-14 px-5 rounded-2xl bg-white/5 border border-white/10 text-white outline-none focus:border-purple/50 transition-all"
                />
                <button 
                  onClick={() => { store.setApiKey(apiKeyInput); store.setShowKeyRow(false); }}
                  className="w-full h-14 rounded-2xl bg-purple text-white font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {store.showOnboard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-2xl glass-strong rounded-[40px] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-teal/20 rounded-full blur-[100px]" />
              
              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple to-indigo mx-auto flex items-center justify-center shadow-2xl shadow-purple/40">
                  <Zap size={40} className="text-white fill-white/20" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tighter">Welcome to PMP <span className="text-purple">v6 PRO</span></h1>
                  <p className="text-white/40 font-medium tracking-wide">THE ULTIMATE LYRICIST WORKSTATION</p>
                </div>
                
                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-purple"><Brain size={24} /></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest">AI Persona</div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-teal"><Gauge size={24} /></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest">Flow Engine</div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-hot"><Mic2 size={24} /></div>
                    <div className="text-[10px] font-bold uppercase tracking-widest">DAW Grade</div>
                  </div>
                </div>

                <button 
                  onClick={() => { store.setShowOnboard(false); localStorage.setItem('pmp6_toured', 'true'); }}
                  className="w-full h-16 rounded-3xl bg-white text-black text-lg font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  Enter the Studio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={store.beatUrl || undefined} loop />
    </div>
  );
}
