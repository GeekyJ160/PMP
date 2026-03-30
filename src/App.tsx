import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Mic, Settings, Plus, Wand2, Download, Trash2, Upload, AlignLeft, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface LyricLine {
  id: string;
  text: string;
  startBeat: number;
  durationBeats: number;
}

interface Take {
  id: string;
  name: string;
  startBeat: number;
  durationBeats: number;
  url?: string;
}

export default function App() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playheadBeat, setPlayheadBeat] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([
    { id: '1', text: 'Dallas nights, purple lights', startBeat: 0, durationBeats: 4 },
    { id: '2', text: 'Pen ignites, syllables tight', startBeat: 4, durationBeats: 4 },
    { id: '3', text: 'Riding the wave until the sun sets on my name', startBeat: 8, durationBeats: 4 },
    { id: '4', text: 'Flip the page, another chapter starts to flame', startBeat: 12, durationBeats: 4 },
  ]);
  const [takes, setTakes] = useState<Take[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [aiPanelContent, setAiPanelContent] = useState<string>('Select a line to get AI suggestions.');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [beatUrl, setBeatUrl] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);

  const handleBeatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBeatUrl(URL.createObjectURL(file));
      // Mock waveform generation
      const mockWaveform = Array.from({ length: totalBeats * 4 }, () => Math.random() * 0.8 + 0.1);
      setWaveform(mockWaveform);
    }
  };

  const totalBeats = 64; // 16 bars of 4 beats
  const beatsPerBar = 4;
  const pixelsPerBeat = 40; // Width of one beat in pixels

  // Playhead animation
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      const beatsPerSecond = bpm / 60;
      const updateIntervalMs = 50;
      const beatsPerUpdate = beatsPerSecond * (updateIntervalMs / 1000);

      interval = window.setInterval(() => {
        setPlayheadBeat((prev) => {
          const next = prev + beatsPerUpdate;
          return next > totalBeats ? 0 : next;
        });
      }, updateIntervalMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, bpm, totalBeats]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleRec = () => {
    if (isRecording) {
      setIsRecording(false);
      // Mock saving a take
      const newTake: Take = {
        id: Date.now().toString(),
        name: `Take ${takes.length + 1}`,
        startBeat: Math.floor(playheadBeat),
        durationBeats: 4,
      };
      setTakes([...takes, newTake]);
    } else {
      setIsRecording(true);
      if (!isPlaying) setIsPlaying(true);
    }
  };

  const handleLineClick = (id: string) => {
    setSelectedLineId(id);
    const line = lyrics.find((l) => l.id === id);
    if (line) {
      setAiPanelContent(`Selected: "${line.text}"\n\nClick "Match Flow" or "Rewrite" for AI suggestions.`);
    }
  };

  const handleLineChange = (id: string, newText: string) => {
    setLyrics(lyrics.map((l) => (l.id === id ? { ...l, text: newText } : l)));
  };

  const addLine = () => {
    const lastLine = lyrics[lyrics.length - 1];
    const newStart = lastLine ? lastLine.startBeat + lastLine.durationBeats : 0;
    const newLine: LyricLine = {
      id: Date.now().toString(),
      text: '',
      startBeat: newStart,
      durationBeats: 4,
    };
    setLyrics([...lyrics, newLine]);
    setSelectedLineId(newLine.id);
  };

  const quantizeLine = () => {
    if (!selectedLineId) return;
    setLyrics(prev => prev.map(line => {
      if (line.id === selectedLineId) {
        // Quantize to nearest 1/4 beat (16th note)
        const quantizedBeat = Math.round(line.startBeat * 4) / 4;
        return { ...line, startBeat: quantizedBeat };
      }
      return line;
    }));
    setAiPanelContent(`Quantized line to nearest 1/16th note.`);
  };

  const alignVocals = () => {
    if (!selectedLineId) return;
    setAiPanelContent('Aligning vocals to beat grid... (Simulated)');
    setTimeout(() => {
      quantizeLine();
      setAiPanelContent('Vocals aligned and quantized successfully.');
    }, 1000);
  };

  const generateAI = (type: 'rewrite' | 'flow' | 'rhyme') => {
    if (!selectedLineId) return;
    const line = lyrics.find((l) => l.id === selectedLineId);
    if (!line) return;

    setIsAiLoading(true);
    setAiPanelContent('Generating...');

    // Mock AI generation
    setTimeout(() => {
      let result = '';
      if (type === 'rewrite') {
        result = `Rewrite suggestions for:\n"${line.text}"\n\n1. ${line.text} but harder\n2. ${line.text} but faster\n3. A completely different vibe`;
      } else if (type === 'flow') {
        result = `Flow match for:\n"${line.text}"\n\nTarget syllables: 8\n1. "Shadows fall, I hear the call"\n2. "Midnight strikes, we take the flight"`;
      } else if (type === 'rhyme') {
        const lastWord = line.text.split(' ').pop() || '';
        result = `Rhymes for "${lastWord}":\n\n- tight\n- bright\n- flight\n- ignite\n- despite`;
      }
      setAiPanelContent(result);
      setIsAiLoading(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0b10] text-[#f0f0f5] font-mono overflow-hidden">
      {/* TOPBAR */}
      <div className="h-14 bg-[#111118] border-b border-[#ffffff0f] flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-['Bebas_Neue'] text-2xl text-[#e8ff47] tracking-wider leading-none">PMP</span>
          <span className="text-[9px] text-[#5a5a72] tracking-widest uppercase mt-1">v8 Studio</span>
        </div>
        
        <div className="w-px h-6 bg-[#ffffff0f] mx-2" />

        <button
          onClick={togglePlay}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all",
            isPlaying ? "bg-[#ff4f6d] text-white" : "bg-[#e8ff47] text-black hover:bg-white"
          )}
        >
          {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {isPlaying ? 'STOP' : 'PLAY'}
        </button>

        <button
          onClick={toggleRec}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all",
            isRecording ? "bg-[#8b001a] text-white animate-pulse" : "bg-[#ff4f6d] text-white hover:brightness-110"
          )}
        >
          <Mic size={14} />
          REC
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#17171f] border border-[#ffffff0f] rounded-full text-xs text-[#5a5a72]">
          <span>BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-12 bg-transparent text-white font-bold outline-none text-center"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button className="p-2 text-[#5a5a72] hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* TIMELINE HEADER */}
        <div className="h-8 bg-[#0f0f15] border-b border-[#ffffff0f] relative overflow-hidden shrink-0">
          <div className="absolute inset-0 flex">
            {Array.from({ length: totalBeats }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-full border-r border-[#ffffff0f] flex items-end pb-1 px-1 text-[9px] text-[#5a5a72]",
                  i % beatsPerBar === 0 ? "border-r-[#ffffff22]" : ""
                )}
                style={{ width: pixelsPerBeat, minWidth: pixelsPerBeat }}
              >
                {i % beatsPerBar === 0 ? `|${i / beatsPerBar + 1}` : ''}
              </div>
            ))}
          </div>
          {/* PLAYHEAD */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#e8ff47] z-20 pointer-events-none shadow-[0_0_10px_#e8ff47]"
            style={{ left: playheadBeat * pixelsPerBeat }}
          />
        </div>

        {/* TIMELINE TRACKS (Takes & Beat) */}
        <div className="h-24 bg-[#111118] border-b border-[#ffffff0f] relative overflow-hidden shrink-0 flex flex-col">
          <div className="absolute inset-0 flex pointer-events-none">
            {Array.from({ length: totalBeats }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-full border-r border-[#ffffff05]",
                  i % beatsPerBar === 0 ? "border-r-[#ffffff11]" : ""
                )}
                style={{ width: pixelsPerBeat, minWidth: pixelsPerBeat }}
              />
            ))}
          </div>

          {/* Beat Track (Waveform) */}
          <div className="h-10 border-b border-[#ffffff0f] relative flex items-center px-2">
            {!beatUrl ? (
              <label className="text-[10px] text-[#5a5a72] cursor-pointer hover:text-white flex items-center gap-1">
                <Upload size={12} /> Load Beat
                <input type="file" accept="audio/*" className="hidden" onChange={handleBeatUpload} />
              </label>
            ) : (
              <div className="absolute inset-0 flex items-center opacity-30 pointer-events-none px-1">
                {waveform.map((h, i) => (
                  <div
                    key={i}
                    className="bg-[#47d4ff] mx-[1px]"
                    style={{
                      height: `${h * 100}%`,
                      width: (pixelsPerBeat / 4) - 2,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Takes Track */}
          <div className="h-14 relative">
            {takes.map((take) => (
              <div
                key={take.id}
                className="absolute top-2 h-10 bg-[#ff4f6d22] border border-[#ff4f6d55] rounded-md flex items-center px-2 text-[10px] text-[#ff4f6d] cursor-pointer hover:bg-[#ff4f6d33] transition-colors"
                style={{
                  left: take.startBeat * pixelsPerBeat,
                  width: take.durationBeats * pixelsPerBeat,
                }}
              >
                <Mic size={12} className="mr-1" />
                {take.name}
              </div>
            ))}
          </div>

          {/* PLAYHEAD */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#e8ff47] z-20 pointer-events-none opacity-50"
            style={{ left: playheadBeat * pixelsPerBeat }}
          />
        </div>

        {/* LYRICS GRID */}
        <div className="flex-1 overflow-auto relative bg-[#060608] p-4">
          <div className="relative" style={{ width: totalBeats * pixelsPerBeat, minHeight: '100%' }}>
            {/* Grid Background */}
            <div className="absolute inset-0 flex pointer-events-none">
              {Array.from({ length: totalBeats }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-full border-r border-[#ffffff05]",
                    i % beatsPerBar === 0 ? "border-r-[#ffffff11]" : ""
                  )}
                  style={{ width: pixelsPerBeat, minWidth: pixelsPerBeat }}
                />
              ))}
            </div>

            {/* Lyrics Cells */}
            <div className="relative z-10 flex flex-col gap-2">
              {lyrics.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "relative min-h-[40px] bg-[#111118] border rounded-md p-2 text-sm transition-colors cursor-text focus-within:border-[#e8ff47] focus-within:bg-[#1a1a24]",
                    selectedLineId === line.id ? "border-[#e8ff47] shadow-[0_0_10px_#e8ff4722]" : "border-[#ffffff22] hover:border-[#ffffff44]"
                  )}
                  style={{
                    marginLeft: line.startBeat * pixelsPerBeat,
                    width: line.durationBeats * pixelsPerBeat,
                  }}
                  onClick={() => handleLineClick(line.id)}
                >
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => handleLineChange(line.id, e.target.value)}
                    className="w-full bg-transparent outline-none text-[#f0f0f5] placeholder-[#5a5a72]"
                    placeholder="Write a bar..."
                  />
                  {/* Syllable markers (mock) */}
                  <div className="absolute -bottom-1.5 left-2 flex gap-1">
                    {line.text.split(' ').map((word, i) => word && (
                      <div key={i} className="h-1 w-1 rounded-full bg-[#47d4ff] opacity-50" title={word} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Line Button */}
            <button
              onClick={addLine}
              className="mt-4 flex items-center gap-2 px-3 py-1.5 text-xs text-[#5a5a72] hover:text-white border border-[#ffffff22] rounded-md hover:bg-[#ffffff0a] transition-colors"
            >
              <Plus size={14} /> Add Bar
            </button>

            {/* PLAYHEAD */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#e8ff47] z-20 pointer-events-none opacity-30"
              style={{ left: playheadBeat * pixelsPerBeat }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div className="h-48 bg-[#111118] border-t border-[#ffffff0f] flex shrink-0">
        {/* Tools */}
        <div className="w-64 border-r border-[#ffffff0f] p-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[9px] text-[#5a5a72] tracking-widest uppercase mb-2">AI Tools</div>
          <button
            onClick={() => generateAI('flow')}
            disabled={!selectedLineId || isAiLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#17171f] border border-[#ffffff0f] rounded-md text-xs hover:bg-[#ffffff0a] hover:border-[#e8ff4755] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Wand2 size={14} className="text-[#e8ff47]" />
            Match Flow
          </button>
          <button
            onClick={() => generateAI('rewrite')}
            disabled={!selectedLineId || isAiLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#17171f] border border-[#ffffff0f] rounded-md text-xs hover:bg-[#ffffff0a] hover:border-[#47d4ff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Wand2 size={14} className="text-[#47d4ff]" />
            Rewrite Line
          </button>
          <button
            onClick={() => generateAI('rhyme')}
            disabled={!selectedLineId || isAiLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[#17171f] border border-[#ffffff0f] rounded-md text-xs hover:bg-[#ffffff0a] hover:border-[#b47fff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Wand2 size={14} className="text-[#b47fff]" />
            Rhyme Alternatives
          </button>
          <div className="text-[9px] text-[#5a5a72] tracking-widest uppercase mt-2 mb-2">Edit Tools</div>
          <button
            onClick={quantizeLine}
            disabled={!selectedLineId}
            className="flex items-center gap-2 px-3 py-2 bg-[#17171f] border border-[#ffffff0f] rounded-md text-xs hover:bg-[#ffffff0a] hover:border-[#ffffff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <AlignLeft size={14} className="text-[#f0f0f5]" />
            Quantize (1/16)
          </button>
          <button
            onClick={alignVocals}
            disabled={!selectedLineId}
            className="flex items-center gap-2 px-3 py-2 bg-[#17171f] border border-[#ffffff0f] rounded-md text-xs hover:bg-[#ffffff0a] hover:border-[#ffffff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <RefreshCw size={14} className="text-[#f0f0f5]" />
            Align Vocals
          </button>
        </div>

        {/* AI Context Panel */}
        <div className="flex-1 p-4 flex flex-col relative overflow-hidden">
          <div className="text-[9px] text-[#5a5a72] tracking-widest uppercase mb-2 flex justify-between items-center">
            <span>Contextual AI</span>
            {isAiLoading && <span className="text-[#e8ff47] animate-pulse">Thinking...</span>}
          </div>
          <div className="flex-1 overflow-y-auto bg-[#060608] border border-[#ffffff0f] rounded-md p-3 text-xs text-[#a0a0b0] whitespace-pre-wrap font-mono leading-relaxed">
            {aiPanelContent}
          </div>
        </div>
      </div>
    </div>
  );
}
