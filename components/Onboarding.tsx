
import React from 'react';
import { Genre } from '../types';

interface Props {
  onSelect: (genre: Genre) => void;
}

const Onboarding: React.FC<Props> = ({ onSelect }) => {
  const genres = [
    { id: Genre.RAP, title: 'Rap / Freestyle', desc: 'Complex rhymes, heavy bass, aggressive flows.', color: 'from-red-500 to-pink-600', icon: 'graphic_eq' },
    { id: Genre.POP, title: 'Pop / Vocals', desc: 'Catchy hooks, bright melodies, polished vibes.', color: 'from-blue-400 to-indigo-600', icon: 'mic' },
    { id: Genre.RNB, title: 'R&B / Soul', desc: 'Smooth melodies, emotional depth, silky vibes.', color: 'from-purple-500 to-pink-500', icon: 'favorite' },
    { id: Genre.CUSTOM, title: 'Custom Muse', desc: 'Train AI on your specific artist reference.', color: 'from-gray-600 to-gray-800', icon: 'psychology' },
  ];

  return (
    <div className="min-h-screen p-8 max-w-lg mx-auto flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10 text-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Meet Your Muse</h2>
        <p className="text-gray-400 mt-2">Select your signature style for AI calibration.</p>
      </header>

      <div className="grid gap-4">
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className="group relative flex items-center p-6 glass rounded-3xl border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 overflow-hidden text-left"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <span className="material-icons-round text-white text-2xl">{g.icon}</span>
            </div>
            <div className="ml-6 flex-1">
              <h3 className="text-xl font-bold text-white mb-1 tracking-tight">{g.title}</h3>
              <p className="text-sm text-gray-400 line-clamp-1">{g.desc}</p>
            </div>
            <span className="material-icons-round text-gray-600 group-hover:text-purple-400 transition-colors">chevron_right</span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-gray-500 uppercase tracking-widest">
        AI trained on 10M+ professional bars & melodies
      </p>
    </div>
  );
};

export default Onboarding;
