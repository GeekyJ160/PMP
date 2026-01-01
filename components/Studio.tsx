
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingCursorPos = useRef<number | null>(null);

  const wordCount = lyrics.trim().split(/\s+/).filter(Boolean).length;
  const charCount = lyrics.length;

  // Effect to handle cursor positioning after lyrics state updates
  useEffect(() => {
    if (pendingCursorPos.current !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pendingCursorPos.current, pendingCursorPos.current);
      pendingCursorPos.current = null;
    }
  }, [lyrics]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playbackActive) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaybackActive(!playbackActive);
  };

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

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); fetchSuggestions(); }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportLyrics(); }
      if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); togglePlayback(); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [lyrics, fetchSuggestions, playbackActive]);

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
    
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzeInstrumental(base64, file.type || 'audio/mpeg');
        
        onUpdateInstrumental({
          url: URL.createObjectURL(file), 
          name: file.name, 
          bpm: analysis?.bpm || null,
          key: analysis?.key || null, 
          energy: analysis?.energy || null,
          vibe: analysis?.vibe || [], 
          mimeType: file.type || 'audio/mpeg'
        });
      } catch (err) {
        console.error("Analysis Failed", err);
      } finally {
        setIsAnalyzing(false);
      }
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

  const applyRhyme = (rhyme: string) => {
    if (!targetRange) return;
    const newLyrics = lyrics.slice(0, targetRange.start) + rhyme + lyrics.slice(targetRange.end);
    pendingCursorPos.current = targetRange.start + rhyme.length;
    setLyrics(newLyrics);
    // Explicitly update targetRange after replacement to allow subsequent immediate replacements
    setTargetRange({ start: targetRange.start, end: targetRange.start + rhyme.length });
    setCurrentWord(rhyme);
  };

  const handleInsertSuggestion = (text: string) => {
    const newLyrics = lyrics + (lyrics.endsWith('\n') || lyrics === '' ? '' : '\n') + text;
    pendingCursorPos.current = newLyrics.length;
    setLyrics(newLyrics);
  };

  useEffect(() => {
    const delay = setTimeout(() => { if (autoSuggest) fetchSuggestions(); }, 3000);
    return () => clearTimeout(delay);
  }, [lyrics, fetchSuggestions, autoSuggest]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A1A] overflow-hidden font-['Inter']">
      <audio ref={audioRef} src={userState.instrumental?.url || ''} loop onEnded={() => setPlaybackActive(false)} />
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-[#121226]/50 border-r border-white/5 p-5 flex-col gap-6 overflow-y-auto custom-scroll">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="material-icons-round text-white select-none">edit_note</span>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter text-white font-['Orbitron']">PMP STUDIO</h1>
            <div className="bg-purple-900/40 px-2 py-0.5 rounded text-[8px] font-black text-purple-300 uppercase tracking-widest inline-block border border-purple-500/20">{userState.genre} MODE</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Beat Lab</label>
             {userState.instrumental && (
               <button onClick={togglePlayback} className="text-purple-400 hover:text-white transition-colors flex items-center gap-1">
                 <span className="text-[8px] font-black uppercase tracking-widest">{playbackActive ? 'Pause' : 'Play'}</span>
                 <span className="material-icons-round text-lg">{playbackActive ? 'pause_circle' : 'play_circle'}</span>
               </button>
             )}
          </div>
          
          <div 
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-[2rem] border-2 border-dashed transition-all duration-500 group flex flex-col items-center justify-center p-6 ${
              isAnalyzing ? 'border-purple-500 bg-purple-500/5 animate-pulse cursor-wait' : 
              userState.instrumental ? 'border-green-500/30 bg-green-500/[0.02] hover:bg-green-500/[0.05]' : 
              'border-white/10 bg-white/[0.02] hover:border-purple-500/40 hover:bg-white/[0.04]'
            }`}
          >
            {isAnalyzing ? (
              <div className="text-center">
                <span className="material-icons-round text-purple-500 text-4xl animate-spin mb-2">sync</span>
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">AI Scanning Waves...</p>
                <div className="mt-2 w-24 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
                   <div className="h-full bg-purple-500 animate-[loading_1.5s_infinite]"></div>
                </div>
              </div>
            ) : userState.instrumental ? (
              <div className="text-center w-full">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all ${playbackActive ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-green-500/20'}`}>
                  <span className="material-icons-round text-green-400">{playbackActive ? 'graphic_eq' : 'audiotrack'}</span>
                </div>
                <p className="text-[10px] font-black text-white truncate px-2 mb-3 uppercase tracking-tight">{userState.instrumental.name}</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/40 border border-white/5 rounded-xl p-2">
                    <p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">Tempo</p>
                    <p className="text-xs font-bold text-green-400">{userState.instrumental.bpm} BPM</p>
                  </div>
                  <div className="bg-black/40 border border-white/5 rounded-xl p-2">
                    <p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">Scale</p>
                    <p className="text-xs font-bold text-blue-400">{userState.instrumental.key}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-[2rem] bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                  <span className="material-icons-round text-gray-500 group-hover:text-purple-400 text-3xl">cloud_upload</span>
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center group-hover:text-purple-400 transition-colors">Import Beat</span>
              </>
            )}
          </div>

          {userState.instrumental && (
             <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-3">
                <div className="flex items-center justify-between">
                   <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Energy Level</span>
                   <span className="text-[9px] font-black text-purple-400">{userState.instrumental.energy}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-purple-500 to-blue-400 transition-all duration-1000" style={{ width: `${userState.instrumental.energy}%` }}></div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                   {userState.instrumental.vibe.map((v, i) => (
                     <span key={i} className="text-[8px] font-black text-gray-300 bg-white/10 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">{v}</span>
                   ))}
                </div>
             </div>
          )}

          <div className="flex items-center justify-between p-4 glass rounded-[2rem] bg-[#1E1E38]/40 border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-icons-round text-gray-400">mic_external_on</span>
              <div>
                <p className="text-xs font-bold text-white">Artist Mode</p>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Drake Cadence</p>
              </div>
            </div>
            <button onClick={() => setArtistMode(!artistMode)} className={`w-10 h-5 rounded-full relative transition-all ${artistMode ? 'bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-gray-700'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${artistMode ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <button onClick={onShowStats} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/5 hover:bg-white/5 text-xs font-bold text-gray-400 transition-all group">
            <span className="material-icons-round text-purple-500 text-sm group-hover:scale-125 transition-transform">auto_graph</span> Studio Analytics
          </button>
          <button onClick={exportLyrics} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/5 hover:bg-white/5 text-xs font-bold text-gray-400 transition-all group">
            <span className="material-icons-round text-purple-500 text-sm group-hover:scale-125 transition-transform">file_download</span> Export Project
          </button>
        </div>

        <div className="mt-auto p-5 bg-purple-900/10 border border-purple-500/10 rounded-[2rem]">
           <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
             <span className="material-icons-round text-xs">psychology</span> Muse Logic
           </h4>
           <p className="text-[8px] text-gray-500 leading-relaxed uppercase font-bold">
             {userState.instrumental 
               ? `Analysis detected ${userState.instrumental.bpm} BPM. AI Lyrical mapping is now synced to track tempo and ${userState.instrumental.key} scale.` 
               : "Upload a beat to calibrate the AI with specific musical tempo and scale markers."}
           </p>
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col relative bg-[#0A0A1A]">
        <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-white tracking-tight font-['Orbitron']">Lyrical Canvas</h2>
             {userState.instrumental && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                   <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Beat Synced</span>
                </div>
             )}
          </div>
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
            onClick={detectWordAtCursor}
            onScroll={() => backdropRef.current && (backdropRef.current.scrollTop = textareaRef.current!.scrollTop)}
            placeholder="Write your hit here..."
            spellCheck={false}
          />
        </div>

        <footer className="px-8 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-600 font-black tracking-widest uppercase">
           <div className="flex gap-10 items-center">
              <span>Words {wordCount}</span>
              <span>Chars {charCount}</span>
              {userState.instrumental && <span>Sync {userState.instrumental.bpm} BPM</span>}
           </div>
           <div className="flex items-center gap-2 text-gray-500">
             <span className={`material-icons-round text-[12px] ${loading ? 'animate-spin text-purple-400' : 'text-purple-600'}`}>
               {loading ? 'sync' : 'auto_awesome'}
             </span>
             {loading ? 'AI Syncing...' : 'AI Mapping Live'}
           </div>
        </footer>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-80 bg-[#121226]/80 border-l border-white/5 flex flex-col">
        <div className="flex p-4 gap-2 bg-black/20">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'ai' ? 'bg-[#1E1E38] text-white border border-white/10 shadow-xl' : 'text-gray-500 hover:text-white'}`}
          >Insights</button>
          <button 
            onClick={() => setActiveTab('rhymes')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'rhymes' ? 'bg-[#1E1E38] text-white border border-white/10 shadow-xl' : 'text-gray-500 hover:text-white'}`}
          >Rhyme Dict</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scroll space-y-4">
          {activeTab === 'ai' ? (
            <>
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Lyrical Muse</h4>
              {suggestions.map((s, i) => (
                <SuggestionCard key={i} suggestion={s} onInsert={handleInsertSuggestion} delay={i * 100} />
              ))}
              {suggestions.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-40">
                  <span className="material-icons-round text-4xl mb-2">lightbulb</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Write more to trigger AI</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Contextual Vault</h4>
              {currentWord ? (
                <div className="p-5 bg-purple-500/10 rounded-[2rem] border border-purple-500/20">
                  <p className="text-[8px] font-black text-purple-400 uppercase mb-1 tracking-widest">Targeting</p>
                  <p className="text-sm font-bold text-white tracking-tight">{currentWord}</p>
                </div>
              ) : (
                <div className="p-10 text-center opacity-20 italic text-[10px] uppercase font-bold tracking-widest">Tap any word to scan rhymes</div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {rhymes.map((r, i) => (
                  <button key={i} onClick={() => applyRhyme(r)} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold hover:bg-purple-600/20 hover:border-purple-600/30 transition-all text-gray-400 hover:text-white">{r}</button>
                ))}
              </div>
              {rhymesLoading && <div className="text-center py-4 animate-pulse text-[10px] text-purple-400 font-black uppercase tracking-[0.2em]">Scanning Vault...</div>}
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
