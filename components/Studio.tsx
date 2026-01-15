
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, LyricSuggestion, InstrumentalData, AppScreen, Genre, SongProject } from '../types';
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
  onLoadProject: (project: SongProject) => void;
  onCreateNew: () => void;
}

const Studio: React.FC<Props> = ({ userState, lyrics, onNavigate, setLyrics, onShowStats, onUpdateInstrumental, onLoadProject, onCreateNew }) => {
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rhymesLoading, setRhymesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'rhymes' | 'projects'>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [selectedWord, setSelectedWord] = useState<{ text: string; start: number; end: number } | null>(null);
  const [savedProjects, setSavedProjects] = useState<SongProject[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync volume with element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Load projects list when switching to projects tab
  useEffect(() => {
    if (activeTab === 'projects') {
      const projectsRaw = localStorage.getItem('pmp_projects');
      if (projectsRaw) {
        setSavedProjects(JSON.parse(projectsRaw));
      }
    }
  }, [activeTab]);

  const handleSelection = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;

    // We only trigger rhyme lookups if something is selected or if cursor is inside a word
    if (start === end) {
      // Find the word bounds around the cursor
      const beforeStr = text.substring(0, start);
      const afterStr = text.substring(start);
      
      const lastSpaceBefore = Math.max(beforeStr.lastIndexOf(' '), beforeStr.lastIndexOf('\n'));
      const startIdx = lastSpaceBefore === -1 ? 0 : lastSpaceBefore + 1;

      const firstSpaceAfter = afterStr.search(/[\s\n]/);
      const endIdx = firstSpaceAfter === -1 ? text.length : start + firstSpaceAfter;

      const word = text.substring(startIdx, endIdx).trim();
      
      if (word.length > 1) {
        setSelectedWord({ 
          text: word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,""), 
          start: startIdx, 
          end: endIdx 
        });
      } else {
        setSelectedWord(null);
      }
    } else {
      const selection = text.substring(start, end).trim();
      // Only highlight if it's a single word (no spaces/newlines)
      if (selection && !selection.includes(' ') && !selection.includes('\n')) {
        setSelectedWord({ text: selection, start, end });
      } else {
        setSelectedWord(null);
      }
    }
  };

  const applyRhyme = (rhyme: string) => {
    if (!selectedWord || !textareaRef.current) return;
    
    const prefix = lyrics.substring(0, selectedWord.start);
    const suffix = lyrics.substring(selectedWord.end);
    const newLyrics = prefix + rhyme + suffix;
    
    const newCursorPos = selectedWord.start + rhyme.length;
    
    setLyrics(newLyrics);
    setSelectedWord(null);
    
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const mimeType = file.type || 'audio/mpeg';

    onUpdateInstrumental({
      url,
      name: file.name,
      bpm: 0,
      key: 'Analyzing...',
      energy: 50,
      vibe: ['Processing'],
      mimeType
    });

    setIsAnalyzing(true);
    setPlaybackActive(false);

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
      const analysis = await analyzeInstrumental(base64Audio, mimeType);
      
      if (analysis) {
        onUpdateInstrumental({
          url,
          name: file.name,
          bpm: analysis.bpm || 90,
          key: analysis.key || 'C Maj',
          energy: analysis.energy || 50,
          vibe: analysis.vibe || ['custom'],
          mimeType
        });
      }
    } catch (err) {
      console.error("Audio processing failed:", err);
      onUpdateInstrumental({ url, name: file.name, bpm: 90, key: 'Detected', energy: 50, vibe: ['Unknown'], mimeType });
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchSuggestions = useCallback(async () => {
    if (!lyrics.trim() || lyrics.length < 5) return;
    setLoading(true);
    const res = await getLyricSuggestions(lyrics, userState.genre, userState.instrumental, userState.artistModeEnabled);
    setSuggestions(res);
    setLoading(false);
  }, [lyrics, userState]);

  const fetchRhymes = useCallback(async () => {
    if (!selectedWord) return;
    setRhymesLoading(true);
    const contextStart = Math.max(0, selectedWord.start - 100);
    const contextEnd = Math.min(lyrics.length, selectedWord.end + 100);
    const snippet = lyrics.substring(contextStart, contextEnd);
    
    const res = await getRhymeSuggestions(selectedWord.text, userState.genre, snippet, userState.instrumental?.bpm);
    setRhymes(res);
    setRhymesLoading(false);
  }, [selectedWord, userState.genre, userState.instrumental?.bpm, lyrics]);

  useEffect(() => {
    if (selectedWord && activeTab === 'rhymes') {
      fetchRhymes();
    }
  }, [selectedWord, activeTab, fetchRhymes]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = e.currentTarget.scrollTop;
      scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (playbackActive) {
      audioRef.current.pause();
      setPlaybackActive(false);
    } else {
      audioRef.current.play().then(() => {
        setPlaybackActive(true);
      }).catch(err => {
        console.error("Audio playback failed.", err);
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { 
      if (userState.autoSuggest && lyrics.length > 10) fetchSuggestions(); 
    }, 4000);
    return () => clearTimeout(timer);
  }, [lyrics, userState.autoSuggest, fetchSuggestions]);

  // Helper to render the background highlight layer
  const renderHighlights = () => {
    if (!selectedWord) return lyrics;

    const before = lyrics.substring(0, selectedWord.start);
    const word = lyrics.substring(selectedWord.start, selectedWord.end);
    const after = lyrics.substring(selectedWord.end);

    return (
      <>
        {before}
        <span className="target-highlight">{word}</span>
        {after}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A1A] overflow-hidden">
      <audio 
        ref={audioRef} 
        src={userState.instrumental?.url} 
        loop 
        onEnded={() => setPlaybackActive(false)}
      />
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="audio/*,.mp3,.wav,.m4a,.ogg" 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      <aside className="w-72 bg-[#121226]/50 border-r border-white/5 p-6 flex flex-col gap-6">
        <h1 className="font-black text-xl tracking-tighter metallic-text font-['Orbitron']">PMP STUDIO</h1>
        
        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Beat Lab</label>
          <div 
            onClick={() => !isAnalyzing && fileInputRef.current?.click()} 
            className="cursor-pointer border-2 border-dashed border-white/10 p-6 rounded-[2.5rem] hover:bg-white/5 transition-all text-center group relative overflow-hidden"
          >
            {isAnalyzing ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <span className="material-icons-round animate-spin text-purple-500 text-3xl">sync</span>
                <p className="text-[9px] font-black uppercase text-purple-400">Scanning Spectrum...</p>
              </div>
            ) : userState.instrumental ? (
              <div>
                <BeatVisualizer active={playbackActive} />
                <p className="text-[10px] font-bold mt-2 truncate text-purple-200 px-2">{userState.instrumental.name}</p>
                <div className="flex justify-between mt-2 px-2 text-[10px] font-black text-green-400 uppercase">
                  <span>{userState.instrumental.bpm || '--'} BPM</span>
                  <span>{userState.instrumental.key}</span>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <span className="material-icons-round text-gray-600 text-3xl mb-2">audiotrack</span>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Load Instrumental</p>
              </div>
            )}
          </div>
        </div>

        {userState.instrumental && (
          <div className="space-y-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
              <span>Output Volume</span>
              <span className="text-purple-400">{Math.round(volume * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-purple-600 bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>
        )}

        <div className="mt-auto space-y-2">
          <button onClick={() => setActiveTab('projects')} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/5 text-xs font-black text-gray-400 hover:bg-white/5 transition-all uppercase tracking-widest">
            <span className="material-icons-round text-lg text-blue-500">folder</span> Project Vault
          </button>
          <button onClick={onShowStats} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/5 text-xs font-black text-gray-400 hover:bg-white/5 transition-all uppercase tracking-widest">
            <span className="material-icons-round text-lg text-purple-500">insights</span> Logic Board
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#0D0D1E]">
        <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[#0D0D1E]/80 backdrop-blur-md z-30">
          <div className="flex flex-col">
            <h2 className="text-xl font-black font-['Orbitron'] uppercase tracking-tight metallic-text">Notepad</h2>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {playbackActive ? 'Streaming Live' : 'Notepad Mode'}
            </span>
          </div>
          <div className="flex gap-4">
            <button onClick={onCreateNew} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all" title="New Project">
              <span className="material-icons-round text-sm">add_circle</span>
            </button>
            {userState.instrumental && (
              <button 
                onClick={togglePlayback} 
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl ${playbackActive ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-purple-600 text-white shadow-purple-500/40'}`}
              >
                <span className="material-icons-round text-sm">{playbackActive ? 'stop' : 'play_arrow'}</span> 
                {playbackActive ? 'Cut Audio' : 'Play Beat'}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {/* Synchronized Background Layer for Highlights */}
          <div 
            ref={scrollRef}
            className="absolute inset-0 p-12 text-3xl font-mono pointer-events-none editor-metrics whitespace-pre-wrap select-none overflow-hidden leading-[1.6] text-transparent"
            aria-hidden="true"
          >
            {renderHighlights()}
          </div>

          <textarea
            ref={textareaRef}
            value={lyrics}
            onSelect={handleSelection}
            onScroll={handleScroll}
            onChange={(e) => {
              setLyrics(e.target.value);
              // Clear selection immediately on change to avoid ghost highlights
              if (selectedWord) setSelectedWord(null);
            }}
            placeholder="Lay your bars here..."
            className="absolute inset-0 w-full h-full bg-transparent p-12 text-3xl font-mono border-none focus:ring-0 resize-none text-gray-200 custom-scroll z-10 leading-[1.6] placeholder:text-white/5"
            spellCheck={false}
          />
        </div>

        <footer className="px-8 py-4 border-t border-white/5 bg-black/20 flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest z-30">
          <div className="flex gap-4 items-center">
            <span>Words: {lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0}</span>
            <div className="w-px h-3 bg-white/10 mx-1"></div>
            {selectedWord && <span className="text-purple-400 animate-pulse">Scanning: "{selectedWord.text}"</span>}
          </div>
          <div className="flex items-center gap-3">
            {playbackActive && (
              <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className="w-0.5 h-2 bg-purple-500 animate-bounce" style={{ animationDelay: `${i*100}ms` }}></div>)}
              </div>
            )}
            <div className="flex items-center gap-2 text-green-500/60 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Neural Link Active
            </div>
          </div>
        </footer>
      </main>

      <aside className="w-80 bg-[#121226]/80 border-l border-white/5 flex flex-col z-40 backdrop-blur-lg">
        <div className="flex p-4 gap-2 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('ai')} 
            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-[#1E1E38] text-white border border-white/10 shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons-round text-xs">auto_awesome</span> Muse
          </button>
          <button 
            onClick={() => {
              setActiveTab('rhymes');
              if (selectedWord) fetchRhymes();
            }} 
            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'rhymes' ? 'bg-[#1E1E38] text-white border border-white/10 shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons-round text-xs">token</span> Vault
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scroll flex-1">
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {suggestions.map((s, i) => (
                <SuggestionCard 
                  key={i} 
                  suggestion={s} 
                  onInsert={(txt) => {
                    const cursor = textareaRef.current?.selectionStart || lyrics.length;
                    const pre = lyrics.slice(0, cursor);
                    const post = lyrics.slice(cursor);
                    setLyrics(pre + (pre.endsWith('\n') || pre === '' ? '' : '\n') + txt + post);
                    textareaRef.current?.focus();
                  }} 
                  delay={i * 100} 
                />
              ))}
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest animate-pulse">Synthesizing...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rhymes' && (
            <div className="space-y-6">
              <header className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rhyme Vault</p>
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter">
                  {selectedWord ? <span>Matches for <span className="text-purple-400">"{selectedWord.text}"</span></span> : <span className="text-gray-500 italic">Select a word...</span>}
                </h3>
              </header>
              
              {rhymesLoading ? (
                <div className="grid grid-cols-2 gap-2">
                   {[...Array(12)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-2xl animate-pulse"></div>)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {rhymes.map((r, i) => (
                    <button 
                      key={i} 
                      onClick={() => applyRhyme(r)}
                      className="p-3 bg-white/5 rounded-2xl text-xs font-bold text-gray-300 hover:bg-purple-600 hover:text-white border border-white/5 hover:border-purple-500/50 transition-all truncate text-left group"
                    >
                      <span className="text-gray-600 group-hover:text-purple-300 mr-1 opacity-50">#</span>{r}
                    </button>
                  ))}
                  {rhymes.length === 0 && !rhymesLoading && selectedWord && (
                    <p className="col-span-2 text-center text-[10px] text-gray-600 uppercase font-black py-10 tracking-widest">Zero Matches Found</p>
                  )}
                </div>
              )}
              
              {!selectedWord && (
                <div className="py-20 text-center opacity-30">
                  <span className="material-icons-round text-5xl mb-4">touch_app</span>
                  <p className="text-[10px] font-black uppercase leading-relaxed">Highlight or tap any word<br/>to open the vault</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Saved Drafts</p>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Archives</h3>
                </div>
                <button onClick={() => setActiveTab('ai')} className="text-gray-500 hover:text-white">
                  <span className="material-icons-round">close</span>
                </button>
              </header>

              <div className="space-y-3">
                {savedProjects.length > 0 ? savedProjects.map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      onLoadProject(p);
                      setActiveTab('ai');
                    }}
                    className="w-full p-4 glass hover:bg-white/5 rounded-2xl border border-white/5 text-left transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{p.userState.genre}</span>
                      <span className="text-[8px] font-bold text-gray-600 uppercase">{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-200 group-hover:text-white truncate mb-1">
                      {p.lyrics.split('\n')[0].substring(0, 20) || 'Untitled Draft'}
                    </h4>
                    <p className="text-[9px] text-gray-500 line-clamp-1 italic">
                      {p.lyrics.substring(0, 50)}...
                    </p>
                  </button>
                )) : (
                  <div className="py-20 text-center opacity-30">
                    <span className="material-icons-round text-5xl mb-4">folder_open</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">No Saved Sessions</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={onCreateNew}
                className="w-full py-4 rounded-2xl border border-dashed border-white/20 text-[10px] font-black text-gray-500 uppercase tracking-widest hover:border-purple-500/50 hover:text-purple-400 transition-all"
              >
                + New Manuscript
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Studio;
