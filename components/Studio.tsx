
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserState, LyricSuggestion, InstrumentalData, AppScreen } from '../types';
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

const Studio: React.FC<Props> = ({ userState, lyrics, onNavigate, setLyrics, onShowStats, onUpdateInstrumental }) => {
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rhymesLoading, setRhymesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'rhymes'>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [currentWord, setCurrentWord] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!lyrics.trim() || lyrics.length < 5) return;
    setLoading(true);
    const res = await getLyricSuggestions(lyrics, userState.genre, userState.instrumental, userState.artistModeEnabled);
    setSuggestions(res);
    setLoading(false);
  }, [lyrics, userState]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await analyzeInstrumental(base64, file.type);
      if (res) {
        onUpdateInstrumental({
          url: URL.createObjectURL(file),
          name: file.name,
          bpm: res.bpm,
          key: res.key,
          energy: res.energy,
          vibe: res.vibe,
          mimeType: file.type
        });
      }
      setIsAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (userState.autoSuggest) fetchSuggestions(); }, 3000);
    return () => clearTimeout(timer);
  }, [lyrics, userState.autoSuggest, fetchSuggestions]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0A0A1A] overflow-hidden">
      <audio ref={audioRef} src={userState.instrumental?.url} loop />
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />

      <aside className="w-72 bg-[#121226]/50 border-r border-white/5 p-6 flex flex-col gap-6">
        <h1 className="font-black text-xl tracking-tighter metallic-text font-['Orbitron']">PMP STUDIO</h1>
        
        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-500 uppercase">Beat Lab</label>
          <div onClick={() => !isAnalyzing && fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-white/10 p-6 rounded-[2rem] hover:bg-white/5 transition-all text-center">
            {isAnalyzing ? <span className="material-icons-round animate-spin text-purple-500">sync</span> : 
              userState.instrumental ? <div>
                <BeatVisualizer active={playbackActive} />
                <p className="text-[10px] font-bold mt-2 truncate">{userState.instrumental.name}</p>
                <div className="flex justify-between mt-2 text-xs font-bold text-green-400">
                  <span>{userState.instrumental.bpm} BPM</span>
                  <span>{userState.instrumental.key}</span>
                </div>
              </div> : 
              <span className="material-icons-round text-gray-500">cloud_upload</span>
            }
          </div>

          {userState.instrumental && (
            <div className="p-4 bg-white/5 rounded-2xl">
              <div className="flex justify-between text-[10px] mb-2 font-black uppercase">
                <span className="text-gray-500">Energy</span>
                <span className="text-purple-400">{userState.instrumental.energy}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${userState.instrumental.energy}%` }}></div>
              </div>
            </div>
          )}
        </div>

        <button onClick={onShowStats} className="mt-auto flex items-center gap-2 p-4 rounded-xl border border-white/5 text-xs font-bold text-gray-400 hover:bg-white/5">
          <span className="material-icons-round text-sm">auto_graph</span> Visual Intel
        </button>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="px-8 py-6 flex justify-between items-center border-b border-white/5">
          <h2 className="text-xl font-bold font-['Orbitron'] uppercase tracking-tight">Lyrical Canvas</h2>
          <div className="flex gap-4">
            {userState.instrumental && <button onClick={() => { setPlaybackActive(!playbackActive); playbackActive ? audioRef.current?.pause() : audioRef.current?.play(); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-full text-xs font-bold">
              <span className="material-icons-round text-sm">{playbackActive ? 'pause' : 'play_arrow'}</span> {playbackActive ? 'Pause Beat' : 'Test Flow'}
            </button>}
          </div>
        </header>

        <textarea
          ref={textareaRef}
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Enter lyrics..."
          className="flex-1 bg-transparent p-12 text-3xl font-mono border-none focus:ring-0 resize-none text-gray-300 custom-scroll"
        />
        
        <footer className="px-8 py-4 border-t border-white/5 bg-black/20 flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest">
          <div>Words: {lyrics.trim().split(/\s+/).length}</div>
          <div>{loading ? 'AI Syncing...' : 'AI Pulse Active'}</div>
        </footer>
      </main>

      <aside className="w-80 bg-[#121226]/80 border-l border-white/5 flex flex-col">
        <div className="flex p-4 gap-2 border-b border-white/5">
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'ai' ? 'bg-[#1E1E38] text-white border border-white/10' : 'text-gray-500'}`}>The Muse</button>
          <button onClick={() => setActiveTab('rhymes')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'rhymes' ? 'bg-[#1E1E38] text-white border border-white/10' : 'text-gray-500'}`}>The Vault</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scroll">
          {activeTab === 'ai' ? (
            <div className="space-y-4">
              {suggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} onInsert={(txt) => setLyrics(lyrics + '\n' + txt)} delay={i * 100} />)}
              {loading && <div className="text-center py-10 animate-pulse text-purple-400">Synthesizing...</div>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-500 uppercase">Rhyme Dictionary</p>
              <div className="grid grid-cols-2 gap-2">
                {rhymes.map((r, i) => <button key={i} className="p-3 bg-white/5 rounded-xl text-xs hover:bg-purple-600/20">{r}</button>)}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Studio;
