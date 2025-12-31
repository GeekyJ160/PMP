
import React, { useState, useEffect } from 'react';

const Splash: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => (p < 100 ? p + 2 : 100));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F0F23] to-[#1E1428] z-50 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center animate-bounce duration-1000">
        <div className="mb-8 relative">
           <span className="material-icons-round text-8xl metallic-text">edit_note</span>
           <div className="absolute -top-4 -right-4 animate-spin-slow">
              <span className="material-icons-round text-purple-400 text-3xl">music_note</span>
           </div>
        </div>
        <h1 className="text-7xl font-black tracking-tighter metallic-text font-['Orbitron']">PMP</h1>
        <p className="text-xl font-medium text-purple-300 tracking-[0.3em] uppercase mt-2">Pen Melody Pad</p>
      </div>

      <div className="w-full max-w-xs mt-16 space-y-3 px-6">
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-blue-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-purple-400 font-mono tracking-widest uppercase">
          <span>Initializing AI</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default Splash;
