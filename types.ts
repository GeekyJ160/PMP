
export type AppScreen = 'splash' | 'onboarding' | 'voice' | 'studio' | 'stats';

export enum Genre {
  RAP = 'RAP',
  POP = 'POP',
  RNB = 'RNB',
  CUSTOM = 'CUSTOM'
}

export interface LyricSuggestion {
  text: string;
  type: 'rhyme' | 'flow' | 'metaphor' | 'punchline' | 'hook';
  score: number;
  rating: number;
}

export interface UserState {
  genre: Genre;
  rhymeScore: number;
  flowScore: number;
  energyScore: number;
  bpm: number;
}
