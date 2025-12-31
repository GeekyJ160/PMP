
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, Genre, LyricSuggestion } from '../types';
import { getLyricSuggestions, getRhymeSuggestions, analyzeInstrumental } from '../services/gemini';
import SuggestionCard from './SuggestionCard';
import BeatVisualizer from './BeatVisualizer';

interface Props {
  userState: UserState;
  lyrics: string;
  setLyrics: (val: string) => void;
  onShowStats: () => void;
}

const Studio: React.FC<Props> = ({ userState, lyrics, setLyrics, onShowStats }) => {
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rhymesLoading, setRhymesLoading] = useState(false);
  const [autoComplete, setAutoComplete] = useState(true);
  const [currentWord, setCurrentWord] = useState('');
  const [activeTab, setActiveTab] = useState<'ai' | 'rhymes'>('ai');
  const [targetRange, setTargetRange] = useState<{ start: number; end: number } | null>(null);
  
  // Instrumental & Beat Lab State
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzingInstrumental, setAnalyzingInstrumental] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderHighlightedText = () => {
    if (!currentWord || !targetRange) return lyrics;
    const { start, end } = targetRange;
    return (
      <>
        {lyrics.slice(0, start)}
        <span className="bg-purple-500/30 border-b-2 border-purple-400 text-transparent rounded-sm">
          {lyrics.slice(start, end)}
        </span>
        {lyrics.slice(end)}
      </>
    );
  };

  const fetchSuggestions = useCallback(async () => {
    if (!lyrics.trim() || lyrics.length < 10) return;
    setLoading(true);
    const res = await getLyricSuggestions(lyrics, userState.genre, detectedBpm, detectedKey);
    setSuggestions(res);
    setLoading(false);
  }, [lyrics, userState.genre, detectedBpm, detectedKey]);

  const detectWordAtCursor = useCallback(() => {
    if (!textareaRef.current) return;
    const startPos = textareaRef.current.selectionStart;
    const endPos = textareaRef.current.selectionEnd;
    const text = textareaRef.current.value;
    
    let word = '';
    let rangeStart = startPos;
    let rangeEnd = endPos;
    
    if (startPos !== endPos) {
      word = text.slice(startPos, endPos).trim();
    } else {
      rangeStart = startPos;
      while (rangeStart > 0 && /\w/.test(text[rangeStart - 1])) rangeStart--;
      rangeEnd = startPos;
      while (rangeEnd < text.length && /\w/.test(text[rangeEnd])) rangeEnd++;
      word = text.slice(rangeStart, rangeEnd).trim();
    }
    
    if (word && /^[a-zA-Z0-9'-]+$/.test(word)) {
      setCurrentWord(word);
      setTargetRange({ start: rangeStart, end: rangeEnd });
    } else {
      setCurrentWord('');
      setTargetRange(null);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingInstrumental(true);
    const url = URL.createObjectURL(file);
    setInstrumentalUrl(url);

    // AI Analysis
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await analyzeInstrumental(base64);
      if (analysis) {
        setDetectedBpm(analysis.bpm);
        setDetectedKey(analysis.key);
        setVibeTags(analysis.vibe || []);
      }
      setAnalyzingInstrumental(false);
    };
    reader.readAsDataURL(file);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (autoComplete) fetchSuggestions();
    }, 2500);
    return () => clearTimeout(delay);
  }, [lyrics, fetchSuggestions, autoComplete]);

  useEffect(() => {
    const fetchRhymes = async () => {
      if (!currentWord || currentWord.length < 2) {
        setRhymes([]);
        return;
      }
      setRhymesLoading(true);
      const snippetStart = Math.max(0, (targetRange?.start || 0) - 200);
      const snippetEnd = Math.min(lyrics.length, (targetRange?.end || 0) + 200);
      const res = await getRhymeSuggestions(currentWord, userState.genre, lyrics.slice(snippetStart, snippetEnd), detectedBpm);
      setRhymes(res);
      setRhymesLoading(false);
    };

    const delay = setTimeout(fetchRhymes, 400);
    return () => clearTimeout(delay);
  }, [currentWord, userState.genre, targetRange, detectedBpm]);

  const applyRhyme = (rhyme: string) => {
    if (!textareaRef.current || !targetRange) return;
    const { start, end } = targetRange;
    const text = textareaRef.current.value;
    const newText = text.slice(0, start) + rhyme + text.slice(end);
    setLyrics(newText);
    const newCursorPos = start + rhyme.length;
    
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        detectWordAtCursor();
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0F0F23]">
      <audio 
        ref={audioRef} 
        src={instrumentalUrl || ''} 
        loop 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Sidebar - Beat Lab & Tools */}
      <aside className="w-full md:w-80 glass-dark border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto custom-scroll">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
            <span className="material-icons-round text-white">edit_note</span>
          </div>
          <div>
            <h1 className="font-bold tracking-tight">PMP STUDIO</h1>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
              {userState.genre} MODE
            </span>
          </div>
        </div>

        {/* Instrumental Section */}
        <div className="glass p-5 rounded-[2rem] border border-white/10 space-y-4">
          <div className="flex justify-between items-center px-1">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Beat Lab</span>
             {analyzingInstrumental && (
               <div className="flex items-center gap-2">
                 <span className="text-[10px] text-purple-400 font-mono animate-pulse uppercase">AI SCANNING...</span>
                 <div className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
             )}
          </div>
          
          {!instrumentalUrl ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-600/20 transition-all">
                <span className="material-icons-round text-gray-600 group-hover:text-purple-400">add</span>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-300">Drop Instrumental</span>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                <button 
                  onClick={togglePlayback}
                  className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <span className="material-icons-round text-white text-3xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate text-gray-200 uppercase tracking-tight">Active Beat</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {detectedBpm ? (
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg font-black border border-blue-500/20">{detectedBpm} BPM</span>
                    ) : (
                      <span className="text-[9px] bg-gray-500/10 text-gray-500 px-2 py-0.5 rounded-lg font-black italic">BPM ???</span>
                    )}
                    {detectedKey && (
                      <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg font-black border border-green-500/20">{detectedKey}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => {setInstrumentalUrl(null); setDetectedBpm(null); setDetectedKey(null); setIsPlaying(false);}} className="text-gray-600 hover:text-red-400 transition-colors p-2">
                   <span className="material-icons-round text-sm">close</span>
                </button>
              </div>
              
              <div className="px-1">
                <BeatVisualizer active={isPlaying} />
              </div>

              {vibeTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {vibeTags.map(tag => (
                    <span key={tag} className="text-[8px] text-gray-500 uppercase font-black border border-white/5 px-2 py-0.5 rounded bg-black/20">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button onClick={onShowStats} className="w-full flex items-center gap-3 p-4 rounded-2xl glass hover:bg-white/10 transition-all text-sm font-medium">
            <span className="material-icons-round text-blue-400">insights</span>
            Studio Analytics
          </button>
          <button className="w-full flex items-center gap-3 p-4 rounded-2xl glass hover:bg-white/10 transition-all text-sm font-medium">
            <span className="material-icons-round text-yellow-400">visibility</span>
            AR Lyric View
          </button>
        </div>

        <div className="mt-auto p-5 rounded-3xl bg-purple-600/10 border border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
                <span className="material-icons-round text-purple-400 text-sm">auto_awesome</span>
                <h4 className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Muse Logic</h4>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed font-medium uppercase tracking-wider">
                {instrumentalUrl ? `Musical DNA detected. Suggestions calibrated to ${detectedBpm || 'N/A'} BPM rhythmics and ${detectedKey || 'current'} scales.` : 'Upload a beat to sync AI cadence with musical key and BPM for precision writing.'}
            </p>
        </div>
      </aside>

      {/* Main Content - Editor & Insights */}
      <main className="flex-1 flex flex-col p-6 h-screen overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Lyrical Canvas</h2>
              {instrumentalUrl && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 animate-pulse">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                   <span className="text-[9px] font-black text-green-300 uppercase tracking-widest">Beat Sync Active</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs font-mono text-gray-400 uppercase tracking-widest">
                <div className={`w-2 h-2 rounded-full ${autoComplete ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                Auto-Suggest: {autoComplete ? 'ON' : 'OFF'}
              </div>
              <button 
                onClick={() => setAutoComplete(!autoComplete)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${autoComplete ? 'bg-purple-600' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${autoComplete ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
            {/* Editor Pane */}
            <div className="flex-1 relative glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col shadow-inner">
               <div 
                 ref={highlightRef} 
                 aria-hidden="true" 
                 className="absolute inset-0 p-10 text-xl md:text-2xl leading-[1.8] text-transparent pointer-events-none whitespace-pre-wrap break-words overflow-hidden" 
                 style={{ font: 'inherit' }}
               >
                 {renderHighlightedText()}
                 <div className="inline-block w-px h-px opacity-0"></div>
               </div>

               <textarea
                 ref={textareaRef}
                 className="flex-1 w-full bg-transparent border-none focus:ring-0 p-10 text-xl md:text-2xl leading-[1.8] text-gray-100 font-medium placeholder-gray-800 resize-none overflow-y-auto z-10 custom-scroll"
                 value={lyrics}
                 onChange={(e) => setLyrics(e.target.value)}
                 onKeyUp={detectWordAtCursor}
                 onMouseUp={detectWordAtCursor}
                 onSelect={detectWordAtCursor}
                 onScroll={syncScroll}
                 placeholder="Lyrical exploration starts here..."
                 spellCheck={false}
               />
               
               <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase z-20 backdrop-blur-md">
                 <div className="flex gap-8">
                    <span className="flex items-center gap-1.5"><span className="text-gray-700">WORDS</span> {lyrics.split(/\s+/).filter(Boolean).length}</span>
                    <span className="flex items-center gap-1.5"><span className="text-gray-700">CHARS</span> {lyrics.length}</span>
                    {currentWord && <span className="text-purple-400 font-black animate-pulse flex items-center gap-1"><span className="w-1 h-1 bg-purple-400 rounded-full"></span> FOCUS: {currentWord}</span>}
                 </div>
                 <div className="flex items-center gap-2 text-purple-400 font-black">
                    <span className="material-icons-round text-xs animate-spin-slow">auto_fix_high</span>
                    AI MAPPING
                 </div>
               </div>
            </div>

            {/* Intelligence Side Panel */}
            <div className="w-full md:w-80 flex flex-col gap-0 overflow-hidden glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl">
              <div className="flex border-b border-white/10 p-1">
                <button 
                  onClick={() => setActiveTab('ai')} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === 'ai' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Insights
                </button>
                <button 
                  onClick={() => setActiveTab('rhymes')} 
                  className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === 'rhymes' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Rhyme Dict
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scroll">
                {activeTab === 'ai' ? (
                  <>
                    <div className="flex items-center justify-between sticky top-0 bg-[#0F0F23]/90 backdrop-blur-md z-10 py-2">
                       <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Lyrical Muse</h3>
                       {loading && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    {suggestions.length === 0 && !loading && (
                      <div className="py-20 text-center opacity-40">
                        <span className="material-icons-round text-5xl mb-3">lightbulb</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Write more to get ideas</p>
                      </div>
                    )}
                    {suggestions.map((s, i) => (
                      <SuggestionCard key={i} suggestion={s} onInsert={(txt) => setLyrics(lyrics + (lyrics.endsWith('\n') ? '' : '\n') + txt)} delay={i * 100} />
                    ))}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between sticky top-0 bg-[#0F0F23]/90 backdrop-blur-md z-10 py-2">
                       <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                         {currentWord ? `Rhymes for "${currentWord}"` : 'Dictionary'}
                       </h3>
                       {rhymesLoading && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    
                    {!currentWord && (
                      <div className="py-20 text-center opacity-40">
                        <span className="material-icons-round text-5xl mb-3">radar</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Tap a word to start</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {rhymes.map((rhyme, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => applyRhyme(rhyme)} 
                          className="group relative px-3 py-3 rounded-xl glass hover:bg-purple-600/20 text-xs font-bold text-gray-300 hover:text-white transition-all border border-white/5 truncate uppercase tracking-tighter"
                        >
                          {rhyme}
                        </button>
                      ))}
                    </div>
                    
                    {currentWord && rhymes.length > 0 && (
                      <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[9px] text-gray-500 leading-relaxed font-bold uppercase tracking-widest">
                          Tapping a rhyme will automatically replace your focused word in the editor.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Studio;
