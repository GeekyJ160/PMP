
import React from 'react';
import { LyricSuggestion } from '../types';

interface Props {
  suggestion: LyricSuggestion;
  onInsert: (text: string) => void;
  delay: number;
}

const SuggestionCard: React.FC<Props> = ({ suggestion, onInsert, delay }) => {
  const typeIcons: Record<string, string> = {
    rhyme: 'alternate_email',
    flow: 'timeline',
    metaphor: 'psychology',
    punchline: 'emoji_events',
    hook: 'loop'
  };

  const typeColors: Record<string, string> = {
    rhyme: 'bg-blue-500/20 text-blue-400',
    flow: 'bg-green-500/20 text-green-400',
    metaphor: 'bg-purple-500/20 text-purple-400',
    punchline: 'bg-yellow-500/20 text-yellow-400',
    hook: 'bg-pink-500/20 text-pink-400'
  };

  return (
    <div 
      className="group p-5 glass-dark rounded-3xl border border-white/5 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 animate-in fade-in slide-in-from-right-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1 ${typeColors[suggestion.type]}`}>
          <span className="material-icons-round text-xs">{typeIcons[suggestion.type]}</span>
          {suggestion.type}
        </span>
        <span className="text-[10px] text-gray-500 font-bold">{suggestion.score}% MATCH</span>
      </div>
      
      <p className="text-gray-200 text-sm leading-relaxed mb-4 group-hover:text-white transition-colors italic">
        "{suggestion.text}"
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-0.5">
           {[...Array(5)].map((_, i) => (
             <span key={i} className={`material-icons-round text-[10px] ${i < suggestion.rating ? 'text-yellow-500' : 'text-gray-700'}`}>star</span>
           ))}
        </div>
        <button 
          onClick={() => onInsert(suggestion.text)}
          className="flex items-center gap-1 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors"
        >
          Insert <span className="material-icons-round text-sm">add</span>
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;
