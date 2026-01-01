
import React from 'react';
import { Genre } from '../types';

interface Props {
  onSelect: (genre: Genre) => void;
}

const Onboarding: React.FC<Props> = ({ onSelect }) => {
  const genres = [
    { 
      id: Genre.RAP, 
      title: 'Rap / Freestyle', 
      desc: 'Complex rhymes, heavy bass, aggressive flows.', 
      color: 'from-[#FF3B3B] to-[#660000]', 
      icon: 'graphic_eq' 
    },
    { 
      id: Genre.POP, 
      title: 'Pop / Vocals', 
      desc: 'Catchy hooks, bright melodies, polished vibes.', 
      color: 'from-[#3B82F6] to-[#1E3A8A]', 
      icon: 'mic' 
    },
    { 
      id: Genre.RNB, 
      title: 'R&B / Soul', 
      desc: 'Smooth melodies, emotional depth, silky vibes.', 
      color: 'from-[#A855F7] to-[#4C1D95]', 
      icon: 'favorite' 
    },
    { 
      id: Genre.CUSTOM, 
      title: 'Custom Muse', 
      desc: 'Train AI on your specific artist reference.', 
      color: 'from-[#374151] to-[#111827]', 
      icon: 'psychology' 
    },
  ];

  return (
    <div className="min-h-screen p-8 max-w-lg mx-auto flex flex-col justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <header className="mb-12 text-center">
        <h2 className="text-5xl font-black metallic-text font-['Orbitron'] tracking-tighter mb-3">Meet Your Muse</h2>
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em]">Select your signature style for AI calibration</p>
      </header>

      <div className="flex flex-col gap-4">
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className="group relative flex items-center p-6 bg-white/[0.02] hover:bg-white/[0.05] rounded-[2.5rem] border border-white/[0.05] hover:border-purple-500/40 transition-all duration-500 overflow-hidden text-left shadow-2xl"
          >
            {/* Glossy Icon Background */}
            <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-2xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border border-white/10`}>
              <span className="material-icons-round text-white text-3xl select-none">{g.icon}</span>
            </div>

            <div className="ml-6 flex-1 pr-10">
              <h3 className="text-xl font-black text-white mb-1 tracking-tight font-['Orbitron']">{g.title}</h3>
              <p className="text-[11px] font-medium text-gray-500 line-clamp-1 uppercase tracking-wider">{g.desc}</p>
            </div>

            <div className="absolute right-6 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-500">
               <span className="material-icons-round text-purple-400 text-3xl select-none">chevron_right</span>
            </div>
            
            {/* Subtle Gradient Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700"></div>
          </button>
        ))}
      </div>

      <div className="mt-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
           <span className="w-1 h-1 rounded-full bg-purple-500 animate-ping"></span>
           <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">
             Lyrical Intelligence v4.2.0-STABLE
           </p>
        </div>
        <p className="text-[8px] text-gray-700 uppercase font-black tracking-widest max-w-[280px] mx-auto leading-relaxed">
          AI trained on 10M+ professional bars & multi-platinum melodies
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
