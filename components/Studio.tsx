
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { UserState, LyricSuggestion, InstrumentalData, AppScreen, Genre, SongProject, GENRE_PERSONAS } from '../types';
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
  currentProjectId: string | null;
  onUpdatePersona: (subPersonaId: string) => void;
}

const Studio: React.FC<Props> = ({ userState, lyrics, onNavigate, setLyrics, onShowStats, onUpdateInstrumental, onLoadProject, onCreateNew, currentProjectId, onUpdatePersona }) => {
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [rhymes, setRhymes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rhymesLoading, setRhymesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'rhymes' | 'projects' | 'notes'>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [selectedWord, setSelectedWord] = useState<{ text: string; start: number; end: number } | null>(null);
  const [savedProjects, setSavedProjects] = useState<SongProject[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  const [takes, setTakes] = useState<{id: number, url: string, name: string}[]>([]);
  
  // Recording State
  const [isRecordingPerformance, setIsRecordingPerformance] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingOffset, setRecordingOffset] = useState(0);

  const textareaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const performanceAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Audio Processing Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const instSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (activeTab === 'projects') {
      const projectsRaw = localStorage.getItem('pmp_projects');
      if (projectsRaw) {
        setSavedProjects(JSON.parse(projectsRaw));
      }
    }
  }, [activeTab]);

  // WebSocket Connection
  useEffect(() => {
    if (!currentProjectId) return;

    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('join-project', currentProjectId);

    newSocket.on('sync-state', (state) => {
      setIsRemoteUpdate(true);
      setLyrics(state.lyrics);
      if (state.playback.active && audioRef.current) {
        audioRef.current.currentTime = state.playback.time;
        audioRef.current.play();
        setPlaybackActive(true);
      }
    });

    newSocket.on('lyrics-updated', (newLyrics) => {
      setIsRemoteUpdate(true);
      setLyrics(newLyrics);
    });

    newSocket.on('playback-updated', ({ active, time }) => {
      if (audioRef.current) {
        if (active) {
          audioRef.current.currentTime = time;
          audioRef.current.play();
          setPlaybackActive(true);
        } else {
          audioRef.current.pause();
          setPlaybackActive(false);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [currentProjectId]);

  // Emit lyric changes
  useEffect(() => {
    if (socket && currentProjectId && !isRemoteUpdate) {
      socket.emit('update-lyrics', { projectId: currentProjectId, lyrics });
    }
    setIsRemoteUpdate(false);
  }, [lyrics, socket, currentProjectId]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const text = selection.toString().trim();
    if (text && !text.includes(' ') && !text.includes('\n')) {
      setSelectedWord({ text, start: 0, end: 0 });
      setSavedRange(selection.getRangeAt(0).cloneRange());
    } else {
      setSelectedWord(null);
      setSavedRange(null);
    }
  };

  const applyRhyme = (rhyme: string) => {
    if (!selectedWord || !textareaRef.current || !savedRange) return;
    
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
      document.execCommand('insertText', false, rhyme);
    }
    
    setSelectedWord(null);
    setSavedRange(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    
    // Robust MIME detection
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

    onUpdateInstrumental({
      url,
      name: file.name,
      bpm: 0,
      key: 'Analyzing Spectrum...',
      energy: 50,
      vibe: ['Initializing'],
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
      } else {
        throw new Error("Analysis returned empty");
      }
    } catch (err) {
      console.error("Audio processing failed:", err);
      onUpdateInstrumental({ url, name: file.name, bpm: 90, key: 'Detected', energy: 50, vibe: ['Unknown'], mimeType });
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (textareaRef.current && lyrics !== textareaRef.current.innerHTML) {
      textareaRef.current.innerHTML = lyrics;
    }
  }, [lyrics]);

  const fetchSuggestions = useCallback(async () => {
    const plainText = lyrics.replace(/<[^>]*>?/gm, '');
    if (!plainText.trim() || plainText.length < 5) return;
    setLoading(true);
    const res = await getLyricSuggestions(plainText, userState.genre, userState.instrumental, userState.artistModeEnabled, userState.subPersona);
    setSuggestions(res);
    setLoading(false);
  }, [lyrics, userState]);

  const fetchRhymes = useCallback(async () => {
    if (!selectedWord) return;
    setRhymesLoading(true);
    const plainText = lyrics.replace(/<[^>]*>?/gm, '');
    const snippet = plainText.length > 200 ? plainText.substring(plainText.length - 200) : plainText;
    
    const res = await getRhymeSuggestions(selectedWord.text, userState.genre, snippet, userState.instrumental?.bpm);
    setRhymes(res);
    setRhymesLoading(false);
  }, [selectedWord, userState.genre, userState.instrumental?.bpm, lyrics]);

  useEffect(() => {
    if (selectedWord && activeTab === 'rhymes') {
      fetchRhymes();
    }
  }, [selectedWord, activeTab, fetchRhymes]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    const newActive = !playbackActive;
    const currentTime = audioRef.current.currentTime;

    if (playbackActive) {
      audioRef.current.pause();
      if (performanceAudioRef.current) performanceAudioRef.current.pause();
      setPlaybackActive(false);
    } else {
      audioRef.current.play().then(() => {
        setPlaybackActive(true);
        if (performanceAudioRef.current && recordedAudioUrl) {
          const targetTime = audioRef.current!.currentTime - recordingOffset;
          if (targetTime >= 0 && targetTime < performanceAudioRef.current.duration) {
            performanceAudioRef.current.currentTime = targetTime;
            performanceAudioRef.current.play().catch(e => console.warn("Performance playback failed", e));
          }
        }
      }).catch(err => {
        console.error("Audio playback failed.", err);
      });
    }

    if (socket && currentProjectId) {
      socket.emit('update-playback', { projectId: currentProjectId, active: newActive, time: currentTime });
    }
  };

  // Sync performance to instrumental
  useEffect(() => {
    const inst = audioRef.current;
    const perf = performanceAudioRef.current;
    if (!inst || !perf || !recordedAudioUrl || !playbackActive) return;

    const handleTimeUpdate = () => {
      const targetTime = inst.currentTime - recordingOffset;
      
      if (targetTime < 0) {
        if (!perf.paused) perf.pause();
        perf.currentTime = 0;
      } else if (targetTime > perf.duration) {
        if (!perf.paused) perf.pause();
      } else {
        if (playbackActive && perf.paused && !isRecordingPerformance) {
          perf.play().catch(() => {});
        }
        // Sync if drift is > 150ms
        if (Math.abs(perf.currentTime - targetTime) > 0.15) {
          perf.currentTime = targetTime;
        }
      }
    };

    inst.addEventListener('timeupdate', handleTimeUpdate);
    return () => inst.removeEventListener('timeupdate', handleTimeUpdate);
  }, [playbackActive, recordedAudioUrl, recordingOffset, isRecordingPerformance]);

  // Recording Performance Logic
  const startRecordingPerformance = async () => {
    if (!userState.instrumental || !audioRef.current) return;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Setup Routing
      const dest = ctx.createMediaStreamDestination();
      
      // Instrumental Source (only create once)
      if (!instSourceRef.current) {
        instSourceRef.current = ctx.createMediaElementSource(audioRef.current);
      }
      
      const instGain = ctx.createGain();
      instGain.gain.value = volume;
      instSourceRef.current.disconnect();
      instSourceRef.current.connect(instGain);
      instGain.connect(ctx.destination); // Hear it
      // We DON'T connect inst to dest anymore, so we record ONLY the mic for better sync/mixing later
      // This allows us to "align" it during playback.

      // Microphone Source
      const micSource = ctx.createMediaStreamSource(micStream);
      const micGain = ctx.createGain();
      micGain.gain.value = 1.0;
      micSource.connect(micGain);
      micGain.connect(dest);
      
      const mediaRecorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        setTakes(prev => [...prev, { id: Date.now(), url, name: `Take ${prev.length + 1}` }]);
        micStream.getTracks().forEach(track => track.stop());
      };

      // Snap to Beat Logic
      const bpm = userState.instrumental.bpm || 90;
      const beatDuration = 60 / bpm;
      const currentTime = audioRef.current.currentTime;
      
      // Find next beat or start immediately if close enough
      const nextBeat = Math.ceil(currentTime / beatDuration) * beatDuration;
      const delay = (nextBeat - currentTime) * 1000;

      setIsRecordingPerformance(true);
      setPlaybackActive(true);
      
      if (delay > 50) {
        // Wait for next beat to start recording for perfect alignment
        setTimeout(() => {
          if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
            setRecordingOffset(nextBeat);
          }
        }, delay);
      } else {
        mediaRecorder.start();
        setRecordingOffset(currentTime);
      }

      audioRef.current.play();
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access is required to record your performance.");
    }
  };

  const stopRecordingPerformance = () => {
    if (mediaRecorderRef.current && isRecordingPerformance) {
      mediaRecorderRef.current.stop();
      setIsRecordingPerformance(false);
      setPlaybackActive(false);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const downloadLyrics = () => {
    const element = document.createElement("a");
    const file = new Blob([lyrics], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${userState.instrumental?.name || 'Untitled'}_Lyrics.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadPerformance = () => {
    if (!recordedAudioUrl) return;
    const element = document.createElement("a");
    element.href = recordedAudioUrl;
    element.download = `${userState.instrumental?.name || 'Untitled'}_Performance.webm`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    const timer = setTimeout(() => { 
      if (userState.autoSuggest && lyrics.length > 10) fetchSuggestions(); 
    }, 4000);
    return () => clearTimeout(timer);
  }, [lyrics, userState.autoSuggest, fetchSuggestions]);

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
        loop={!isRecordingPerformance}
        onEnded={() => {
          if (isRecordingPerformance) stopRecordingPerformance();
          setPlaybackActive(false);
        }}
      />
      <audio 
        ref={performanceAudioRef} 
        src={recordedAudioUrl || undefined} 
        onEnded={() => {
          // Performance ended, but instrumental might still be playing
        }}
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
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Beat Lab</label>
            {isAnalyzing && <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>}
          </div>
          <div 
            onClick={() => !isAnalyzing && fileInputRef.current?.click()} 
            className={`cursor-pointer border-2 border-dashed p-6 rounded-[2.5rem] transition-all text-center group relative overflow-hidden ${isAnalyzing ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 hover:bg-white/5'}`}
          >
            {isAnalyzing ? (
              <div className="py-4 flex flex-col items-center gap-2">
                <span className="material-icons-round animate-spin text-purple-500 text-3xl">sync</span>
                <p className="text-[9px] font-black uppercase text-purple-400 tracking-tighter">Harmonic Analysis...</p>
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
          <div className="space-y-4">
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
            
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Export Tools</p>
              <button 
                onClick={downloadLyrics}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 text-[10px] font-black text-gray-400 hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                <span className="material-icons-round text-lg text-blue-400">description</span> Save Lyrics (.txt)
              </button>
              {recordedAudioUrl && (
                <div className="space-y-2">
                  <button 
                    onClick={downloadPerformance}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-[10px] font-black text-green-400 hover:bg-green-500/20 transition-all uppercase tracking-widest animate-in fade-in zoom-in"
                  >
                    <span className="material-icons-round text-lg">download</span> Export Vocal Stem
                  </button>
                  <button 
                    onClick={() => {
                      setRecordedAudioUrl(null);
                      setRecordingOffset(0);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-500/20 text-[10px] font-black text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest"
                  >
                    <span className="material-icons-round text-lg">delete_sweep</span> Clear Take
                  </button>
                </div>
              )}
            </div>

            {takes.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Takes Vault</p>
                  <span className="text-[10px] font-black text-purple-400">({takes.length})</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scroll">
                  {takes.map(take => (
                    <div key={take.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                      <span className="text-xs font-bold text-gray-300 px-2 truncate">{take.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setRecordedAudioUrl(take.url);
                          if (performanceAudioRef.current) {
                            performanceAudioRef.current.src = take.url;
                            performanceAudioRef.current.play();
                          }
                        }} className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/40" title="Play Take"><span className="material-icons-round text-sm">play_arrow</span></button>
                        <button onClick={() => {
                          setTakes(prev => prev.filter(t => t.id !== take.id));
                          if (recordedAudioUrl === take.url) setRecordedAudioUrl(null);
                        }} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40" title="Delete Take"><span className="material-icons-round text-sm">delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              {isRecordingPerformance ? (
                <span className="flex items-center gap-1.5 text-red-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Recording Performance...
                </span>
              ) : playbackActive ? 'Streaming Live' : 'Notepad Mode'}
            </span>
          </div>
          <div className="flex gap-4">
            <button onClick={onCreateNew} className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all" title="New Project">
              <span className="material-icons-round text-sm">add_circle</span>
            </button>
            {userState.instrumental && (
              <div className="flex gap-2">
                <button 
                  onClick={isRecordingPerformance ? stopRecordingPerformance : startRecordingPerformance}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl ${isRecordingPerformance ? 'bg-red-600 text-white shadow-red-500/40 ring-2 ring-red-500/20' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                >
                  <span className="material-icons-round text-sm">{isRecordingPerformance ? 'stop' : 'radio_button_checked'}</span>
                  {isRecordingPerformance ? 'Stop Recording' : 'Record'}
                </button>
                <button 
                  onClick={togglePlayback} 
                  disabled={isRecordingPerformance}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl ${playbackActive ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-purple-600 text-white shadow-purple-500/40'} ${isRecordingPerformance ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="material-icons-round text-sm">{playbackActive ? 'stop' : 'play_arrow'}</span> 
                  {playbackActive ? 'Cut Audio' : 'Play Beat'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 relative flex flex-col m-6 bg-[#121226]/80 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Notepad Toolbar */}
          <div className="h-14 bg-white/5 border-b border-white/10 flex items-center px-6 justify-between">
             <div className="flex gap-2">
                <button onClick={() => document.execCommand('bold')} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all" title="Bold"><span className="material-icons-round text-sm">format_bold</span></button>
                <button onClick={() => document.execCommand('italic')} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all" title="Italic"><span className="material-icons-round text-sm">format_italic</span></button>
                <button onClick={() => document.execCommand('insertUnorderedList')} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all" title="Bullet List"><span className="material-icons-round text-sm">format_list_bulleted</span></button>
                <div className="w-px h-4 bg-white/10 mx-1 self-center"></div>
                <button onClick={() => setLyrics('')} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all" title="Clear Pad"><span className="material-icons-round text-sm">delete_outline</span></button>
                <button onClick={() => navigator.clipboard.writeText(lyrics.replace(/<[^>]*>?/gm, ''))} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-all" title="Copy Lyrics"><span className="material-icons-round text-sm">content_copy</span></button>
             </div>
             {/* Live Scores */}
             <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Flow</span>
                  <span className="text-lg font-black text-emerald-400">{Math.min(99, 60 + Math.floor(lyrics.replace(/<[^>]*>?/gm, '').length / 10))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rhyme</span>
                  <span className="text-lg font-black text-purple-400">{Math.min(99, 50 + (lyrics.match(/<br>|\n|<li>/g)?.length || 0) * 2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Energy</span>
                  <span className="text-lg font-black text-orange-400">{userState.instrumental?.energy || 76}</span>
                </div>
             </div>
          </div>

          {/* Textarea Container */}
          <div className="flex-1 relative">
            <div
              ref={textareaRef}
              contentEditable
              suppressContentEditableWarning
              onMouseUp={handleSelection}
              onKeyUp={handleSelection}
              onInput={(e) => {
                setLyrics(e.currentTarget.innerHTML);
                if (selectedWord) {
                  setSelectedWord(null);
                  setSavedRange(null);
                }
              }}
              placeholder="Texas heat cracklin'... Start spitting"
              className="absolute inset-0 w-full h-full bg-transparent p-10 text-2xl font-mono border-none focus:ring-0 resize-none text-gray-100 custom-scroll z-10 leading-[1.8] outline-none empty:before:content-[attr(placeholder)] empty:before:text-white/20"
              spellCheck={false}
            />
          </div>
        </div>

        <footer className="px-8 py-4 border-t border-white/5 bg-black/20 flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest z-30">
          <div className="flex gap-4 items-center">
            <span>Words: {lyrics.replace(/<[^>]*>?/gm, '').trim() ? lyrics.replace(/<[^>]*>?/gm, '').trim().split(/\s+/).length : 0}</span>
            <div className="w-px h-3 bg-white/10 mx-1"></div>
            {selectedWord && <span className="text-purple-400 animate-pulse">Scanning: "{selectedWord.text}"</span>}
          </div>
          <div className="flex items-center gap-3">
            {(playbackActive || isRecordingPerformance) && (
              <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => <div key={i} className={`w-0.5 h-2 ${isRecordingPerformance ? 'bg-red-500' : 'bg-purple-500'} animate-bounce`} style={{ animationDelay: `${i*100}ms` }}></div>)}
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
          <button 
            onClick={() => setActiveTab('notes')} 
            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-[#1E1E38] text-white border border-white/10 shadow-inner' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="material-icons-round text-xs">edit_note</span> Notes
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 space-y-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <span className="material-icons-round text-purple-400 text-sm">psychology</span>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active Persona</span>
                <span className="text-[10px] font-bold text-gray-300">
                  {userState.artistModeEnabled ? 'Ghostwriter' : 
                   (GENRE_PERSONAS[userState.genre]?.find(p => p.id === userState.subPersona)?.name || GENRE_PERSONAS[userState.genre]?.[0]?.name || 'Versatile Writer')}
                </span>
              </div>
            </div>
            
            {!userState.artistModeEnabled && GENRE_PERSONAS[userState.genre]?.length > 1 && (
              <select 
                value={userState.subPersona || GENRE_PERSONAS[userState.genre][0].id}
                onChange={(e) => onUpdatePersona(e.target.value)}
                className="bg-black/40 border border-white/10 text-white text-[10px] rounded px-2 py-1 outline-none focus:border-purple-500/50"
              >
                {GENRE_PERSONAS[userState.genre].map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 rounded-lg border border-green-500/10">
            <span className="material-icons-round text-green-400 text-sm">group</span>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Collaboration</span>
              <span className="text-[10px] font-bold text-green-300">
                {socket?.connected ? 'Live Sync Active' : 'Connecting...'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Project link copied to clipboard!');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500/5 rounded-lg border border-blue-500/10 hover:bg-blue-500/10 transition-all"
          >
            <span className="material-icons-round text-blue-400 text-sm">share</span>
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Share Session</span>
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
                    setLyrics(prev => prev + (prev ? '<br><br>' : '') + txt);
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                      }
                    }, 50);
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

          {activeTab === 'notes' && (
            <div className="space-y-4 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
              <header className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Scratchpad</p>
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Global Notes</h3>
              </header>
              <div className="flex gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                <button onClick={() => document.execCommand('bold')} className="p-1.5 hover:bg-white/10 rounded text-gray-300 transition-all" title="Bold"><span className="material-icons-round text-sm">format_bold</span></button>
                <button onClick={() => document.execCommand('italic')} className="p-1.5 hover:bg-white/10 rounded text-gray-300 transition-all" title="Italic"><span className="material-icons-round text-sm">format_italic</span></button>
                <button onClick={() => document.execCommand('insertUnorderedList')} className="p-1.5 hover:bg-white/10 rounded text-gray-300 transition-all" title="Bullet List"><span className="material-icons-round text-sm">format_list_bulleted</span></button>
              </div>
              <div 
                className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-4 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 custom-scroll overflow-y-auto"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  localStorage.setItem('pmp_general_notes', e.currentTarget.innerHTML);
                }}
                dangerouslySetInnerHTML={{ __html: localStorage.getItem('pmp_general_notes') || '' }}
              />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Studio;
