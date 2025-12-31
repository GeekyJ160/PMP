
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, Genre, LyricSuggestion, InstrumentalData, AppScreen } from '../types';
import { getLyricSuggestions, getRhymeSuggestions, analyzeInstrumental } from '../services/gemini';
import SuggestionCard from './SuggestionCard';
import BeatVisualizer from './BeatVisualizer';

interface Props {
  userState: UserState;
  lyrics: string;
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  setLyrics: (val: string) => void;
  onShowStats: () => void;
  onUpdateInstrumental: (data: InstrumentalData | null) => void;
}

const Studio: React.FC<Props> = ({ userState, lyrics, currentScreen, onNavigate, setLyrics, onShowStats, onUpdateInstrumental }) => {
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rhymesLoading, setRhymesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'rhymes'>('ai');
  const [targetRange, setTargetRange] = useState<{ start: number; end: number } | null>(null);
  const [currentWord, setCurrentWord] = useState('');
  
  const [artistMode, setArtistMode] = useState(userState.artistModeEnabled);
  const [autoSuggest, setAutoSuggest] = useState(userState.autoSuggest);
  const [showAR, setShowAR] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Persistence & Stats
  const wordCount = lyrics.trim().split(/\s+/).filter(Boolean).length;
  const charCount = lyrics.length;

  const exportLyrics = () => {
    const blob = new Blob([lyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmp_project_${Date.now()}.txt`;
    a.click();
  };

  const fetchSuggestions = useCallback(async () => {
    if (!lyrics.trim() || lyrics.length < 5) return;
    setLoading(true);
    const res = await getLyricSuggestions(lyrics, userState.genre, userState.instrumental, artistMode);
    setSuggestions(res);
    setLoading(false);
  }, [lyrics, userState.genre, userState.instrumental, artistMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); fetchSuggestions(); }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportLyrics(); }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); alert("Project Saved to LocalStorage"); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [lyrics, fetchSuggestions]);

  // Contextual Rhymes logic
  useEffect(() => {
    const fetchRhymes = async () => {
      if (!currentWord || currentWord.length < 2) { setRhymes([]); return; }
      setRhymesLoading(true);
      const start = Math.max(0, (targetRange?.start || 0) - 100);
      const end = Math.min(lyrics.length, (targetRange?.end || 0) + 100);
      const context = lyrics.slice(start, end);
      const res = await getRhymeSuggestions(currentWord, userState.genre, context, userState.instrumental?.bpm);
      setRhymes(res);
      setRhymesLoading(false);
    };
    const delay = setTimeout(fetchRhymes, 500);
    return () => clearTimeout(delay);
  }, [currentWord, lyrics, targetRange, userState.genre, userState.instrumental?.bpm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await analyzeInstrumental(base64, file.type || 'audio/mpeg');
      onUpdateInstrumental({
        url: URL.createObjectURL(file), name: file.name, bpm: analysis?.bpm || null,
        key: analysis?.key || null, energy: analysis?.energy || null,
        vibe: analysis?.vibe || [], mimeType: file.type || 'audio/mpeg'
      });
    };
    reader.readAsDataURL(file);
  };

  const detectWordAtCursor = useCallback(() => {
    if (!textareaRef.current) return;
    const { selectionStart, value } = textareaRef.current;
    let start = selectionStart;
    while (start > 0 && /[\w'-]/.test(value[start - 1])) start--;
    let end = selectionStart;
    while (end < value.length && /[\w'-]/.test(value[end])) end++;
    const word = value.slice(start, end).trim();
    if (word && /^[a-zA-Z0-9'-]+$/.test(word)) {
      setCurrentWord(word);
      setTargetRange({ start, end });
    } else {
      setCurrentWord('');
      setTargetRange(null);
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => { if (autoSuggest) fetchSuggestions(); }, 3000);
    return () => clearTimeout(delay);
  }, [lyrics, fetchSuggestions, autoSuggest]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A1A] overflow-hidden font-['Inter']">
      <audio ref={audioRef} src={userState.instrumental?.url || ''} loop />
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-[#121226]/50 border-r border-white/5 p-5 flex-col gap-6 overflow-y-auto custom-scroll">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center"><span className="material-icons-round text-white">edit_note</span></div>
          <div>
            <h1 className="font-black text-xl tracking-tighter text-white font-['Orbitron']">PMP STUDIO</h1>
            <div className="bg-purple-900/40 px-2 py-0.5 rounded text-[8px] font-black text-purple-300 uppercase tracking-widest inline-block border border-purple-500/20">RAP MODE</div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Beat Lab</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer aspect-video rounded-2xl border-2 border-dashed border-white/5 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-2 transition-all group"
          >
            {userState.instrumental ? (
              <div className="text-center p-4">
                <span className="material-icons-round text-purple-400">audiotrack</span>
                <p className="text-[9px] font-bold text-white truncate w-40 mt-1">{userState.instrumental.name}</p>
                <p className="text-[8px] text-purple-400/60 uppercase">{userState.instrumental.bpm} BPM • {userState.instrumental.key}</p>
              </div>
            ) : (
              <>
                <span className="material-icons-round text-gray-500 group-hover:text-purple-400 text-3xl">add</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Drop Instrumental</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between p-4 glass rounded-2xl bg-[#1E1E38]/40 border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-icons-round text-gray-400">mic_external_on</span>
              <div>
                <p className="text-xs font-bold text-white">Drake Mode</p>
                <p className="text-[8px] text-gray-500">AI ARTIST STYLE</p>
              </div>
            </div>
            <button onClick={() => setArtistMode(!artistMode)} className={`w-10 h-5 rounded-full relative transition-all ${artistMode ? 'bg-purple-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${artistMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={onShowStats} className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-gray-400 transition-all">
            <span className="material-icons-round text-purple-500 text-sm">auto_graph</span> Studio Analytics
          </button>
          <button onClick={exportLyrics} className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-gray-400 transition-all">
            <span className="material-icons-round text-purple-500 text-sm">file_download</span> Export Lyrics
          </button>
          <button onClick={() => setShowAR(true)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-bold text-gray-400 transition-all">
            <span className="material-icons-round text-purple-500 text-sm">visibility</span> AR Lyric View
          </button>
        </div>

        <div className="mt-4 p-4 bg-white/5 rounded-2xl">
          <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Shortcuts</h4>
          <div className="space-y-2 font-mono text-[9px]">
            <div className="flex justify-between text-gray-500"><span>Suggest</span><span className="text-purple-400">Ctrl+Enter</span></div>
            <div className="flex justify-between text-gray-500"><span>Export</span><span className="text-purple-400">Ctrl+E</span></div>
            <div className="flex justify-between text-gray-500"><span>Save</span><span className="text-purple-400">Ctrl+S</span></div>
          </div>
        </div>

        <div className="mt-auto p-4 bg-purple-900/10 border border-purple-500/10 rounded-2xl">
           <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
             <span className="material-icons-round text-xs">psychology</span> Muse Logic
           </h4>
           <p className="text-[8px] text-gray-400 leading-relaxed uppercase">
             Upload a beat to sync AI cadence with musical key and BPM for surgical accuracy.
           </p>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col relative bg-[#0A0A1A]">
        <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-bold text-white tracking-tight font-['Orbitron']">Lyrical Canvas</h2>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Auto-Suggest: {autoSuggest ? 'ON' : 'OFF'}</span>
            <button onClick={() => setAutoSuggest(!autoSuggest)} className={`w-10 h-5 rounded-full relative transition-all ${autoSuggest ? 'bg-purple-600' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoSuggest ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </header>

        <div className="flex-1 px-12 py-4 relative group">
          <div ref={backdropRef} className="absolute inset-0 editor-metrics font-mono text-transparent pointer-events-none select-none overflow-y-auto whitespace-pre-wrap">
            {targetRange && currentWord ? (
              <>{lyrics.slice(0, targetRange.start)}<mark className="target-highlight">{lyrics.slice(targetRange.start, targetRange.end)}</mark>{lyrics.slice(targetRange.end)}</>
            ) : lyrics}
          </div>
          <textarea
            ref={textareaRef}
            className="w-full h-full bg-transparent border-none focus:ring-0 editor-metrics text-gray-300 font-mono placeholder-gray-800 resize-none custom-scroll"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            onKeyUp={detectWordAtCursor}
            onScroll={() => backdropRef.current && (backdropRef.current.scrollTop = textareaRef.current!.scrollTop)}
            placeholder="Started from the bottom now we're here..."
            spellCheck={false}
          />
        </div>

        <footer className="px-8 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 font-black tracking-widest uppercase">
           <div className="flex gap-10 items-center">
              <span>Words {wordCount}</span>
              <span>Chars {charCount}</span>
           </div>
           <div className="flex items-center gap-2 text-gray-500">
             <span className="material-icons-round text-[12px] text-purple-600">auto_awesome</span>
             AI Mapping
           </div>
        </footer>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-80 bg-[#121226]/80 border-l border-white/5 flex flex-col">
        <div className="flex p-4 gap-2 bg-black/20">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'ai' ? 'bg-[#1E1E38] text-white border border-white/10' : 'text-gray-500'}`}
          >Insights</button>
          <button 
            onClick={() => setActiveTab('rhymes')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'rhymes' ? 'bg-[#1E1E38] text-white border border-white/10' : 'text-gray-500'}`}
          >Rhyme Dict</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scroll space-y-4">
          {activeTab === 'ai' ? (
            <>
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Lyrical Muse</h4>
              {suggestions.map((s, i) => (
                <SuggestionCard key={i} suggestion={s} onInsert={(txt) => setLyrics(lyrics + '\n' + txt)} delay={i * 100} />
              ))}
              {suggestions.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-40">
                <span className="material-icons-round text-4xl mb-2">lightbulb</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">Write more to get ideas</p>
              </div>}
            </>
          ) : (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Contextual Vault</h4>
              {currentWord ? (
                <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                  <p className="text-[8px] font-black text-purple-400 uppercase mb-1 tracking-widest">Targeting</p>
                  <p className="text-sm font-bold text-white">{currentWord}</p>
                </div>
              ) : (
                <div className="p-10 text-center opacity-20 italic text-[10px] uppercase">Tap any word to find rhymes</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {rhymes.map((r, i) => (
                  <button key={i} onClick={() => {
                    const newLyrics = lyrics.replace(currentWord, r);
                    setLyrics(newLyrics);
                  }} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold hover:bg-purple-600/20 hover:border-purple-600/30 transition-all text-gray-300">{r}</button>
                ))}
              </div>
              {rhymesLoading && <div className="text-center py-4 animate-pulse text-[10px] text-purple-400 font-bold uppercase">Scanning...</div>}
            </div>
          )}
        </div>
      </aside>

      {/* AR OVERLAY */}
      {showAR && (
        <div className="fixed inset-0 z-[100] bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 flex flex-col items-center justify-center p-20 pointer-events-none">
             <div className="max-w-4xl w-full text-center text-white font-black text-4xl leading-relaxed tracking-tight font-mono uppercase">
               {lyrics.split('\n').map((line, i) => (
                 <div key={i} className="mb-4 opacity-80">{line}</div>
               ))}
             </div>
          </div>
          <button onClick={() => setShowAR(false)} className="absolute top-10 right-10 w-14 h-14 bg-white/10 hover:bg-red-500/50 rounded-full flex items-center justify-center transition-all">
            <span className="material-icons-round text-white">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Studio;
