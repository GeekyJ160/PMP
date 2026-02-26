
export type AppScreen = 'splash' | 'onboarding' | 'voice' | 'studio' | 'stats';

export enum Genre {
  RAP = 'RAP',
  POP = 'POP',
  RNB = 'RNB',
  ROCK = 'ROCK',
  COUNTRY = 'COUNTRY',
  METAL = 'METAL',
  JAZZ = 'JAZZ',
  ELECTRONIC = 'ELECTRONIC',
  CUSTOM = 'CUSTOM'
}

export interface LyricSuggestion {
  text: string;
  type: 'rhyme' | 'flow' | 'metaphor' | 'punchline' | 'hook';
  score: number;
  rating: number;
}

export interface InstrumentalData {
  url: string;
  name: string;
  bpm: number;
  key: string;
  energy: number;
  vibe: string[];
  mimeType: string;
}

export interface UserState {
  genre: Genre;
  subPersona?: string;
  rhymeScore: number;
  flowScore: number;
  energyScore: number;
  bpm: number;
  instrumental: InstrumentalData | null;
  artistModeEnabled: boolean;
  autoSuggest: boolean;
}

export interface SongProject {
  id: string;
  title: string;
  lyrics: string;
  userState: UserState;
  updatedAt: number;
}

export const GENRE_PERSONAS: Record<Genre, { id: string, name: string, prompt: string }[]> = {
  [Genre.RAP]: [
    { id: 'battle', name: 'Battle Rapper', prompt: 'Your style is aggressive, witty, and highly technical. Focus on heavy punchlines, double entendres, complex multi-syllabic rhyme schemes, and relentless rhythmic variety. Your lyrics should hit hard and demand attention.' },
    { id: 'conscious', name: 'Conscious Rapper', prompt: 'Your style is socially aware, poetic, and thought-provoking. Focus on deep metaphors, societal critique, uplifting messages, and intricate storytelling.' },
    { id: 'storyteller', name: 'Storyteller', prompt: 'Your style is narrative-driven and vivid. Focus on painting clear pictures, developing characters, and building suspense through your verses.' }
  ],
  [Genre.POP]: [
    { id: 'hitmaker', name: 'Hitmaker', prompt: 'Your style is infectious, relatable, and melodically driven. Focus on catchy imagery, universal emotional hooks, simple but effective rhyme schemes, and memorable choruses that get stuck in the listener\'s head.' },
    { id: 'ballad', name: 'Ballad Singer', prompt: 'Your style is emotional, dramatic, and soaring. Focus on heartbreak, deep love, vulnerability, and powerful vocal moments.' },
    { id: 'dance', name: 'Dance-Pop', prompt: 'Your style is upbeat, energetic, and club-ready. Focus on rhythm, repetitive hooks, and feel-good, escapist themes.' }
  ],
  [Genre.RNB]: [
    { id: 'soulful', name: 'Soulful Balladeer', prompt: 'Your style is intimate, passionate, and emotionally raw. Focus on vulnerability, sensual imagery, smooth cadences, and poetic expressions of love, heartbreak, and desire.' },
    { id: 'neosoul', name: 'Neo-Soul Poet', prompt: 'Your style is abstract, jazzy, and deeply introspective. Focus on complex metaphors, spiritual themes, and unconventional song structures.' },
    { id: 'contemporary', name: 'Contemporary R&B', prompt: 'Your style is modern, rhythmic, and edgy. Focus on toxic relationships, late-night vibes, and a mix of singing and melodic rapping.' }
  ],
  [Genre.ROCK]: [
    { id: 'icon', name: 'Rock Icon', prompt: 'Your style is raw, energetic, and rebellious. Focus on powerful metaphors, social commentary, gritty imagery, and anthemic choruses.' },
    { id: 'punk', name: 'Punk Rebel', prompt: 'Your style is fast, aggressive, and anti-establishment. Focus on short, punchy lines, political frustration, and raw emotion.' },
    { id: 'alt', name: 'Alternative Thinker', prompt: 'Your style is moody, introspective, and poetic. Focus on existential themes, abstract imagery, and unconventional song structures.' }
  ],
  [Genre.COUNTRY]: [
    { id: 'storyteller', name: 'Country Storyteller', prompt: 'Your style is honest, narrative-driven, and grounded. Focus on vivid storytelling, relatable life experiences, themes of home, family, and resilience.' },
    { id: 'outlaw', name: 'Outlaw Country', prompt: 'Your style is gritty, rebellious, and traditional. Focus on drinking, heartbreak, the open road, and a rejection of modern norms.' },
    { id: 'popcountry', name: 'Pop-Country', prompt: 'Your style is catchy, upbeat, and modern. Focus on feel-good themes, romance, and radio-friendly hooks.' }
  ],
  [Genre.METAL]: [
    { id: 'lyricist', name: 'Metal Lyricist', prompt: 'Your style is visceral, complex, and often explores themes of mythology, philosophy, or societal decay. Focus on powerful, often abstract imagery.' },
    { id: 'doom', name: 'Doom Metal', prompt: 'Your style is slow, heavy, and despairing. Focus on themes of grief, existential dread, and cosmic horror.' },
    { id: 'metalcore', name: 'Metalcore', prompt: 'Your style is aggressive but emotional. Focus on inner turmoil, betrayal, and cathartic breakdowns.' }
  ],
  [Genre.JAZZ]: [
    { id: 'poet', name: 'Jazz Poet', prompt: 'Your style is smooth, improvisational, and rich in subtext. Focus on abstract concepts, urban imagery, and complex emotional nuances.' },
    { id: 'blues', name: 'Blues Crooner', prompt: 'Your style is sorrowful, repetitive, and deeply emotional. Focus on hard times, lost love, and finding strength in pain.' }
  ],
  [Genre.ELECTRONIC]: [
    { id: 'producer', name: 'Electronic Producer', prompt: 'Your style is minimalist, rhythmic, and often atmospheric. Focus on repetitive, hypnotic phrases, and technological metaphors.' },
    { id: 'house', name: 'House Vocalist', prompt: 'Your style is soulful, uplifting, and repetitive. Focus on themes of unity, love, and losing yourself in the music.' },
    { id: 'synthwave', name: 'Synthwave', prompt: 'Your style is nostalgic, cinematic, and neon-drenched. Focus on 80s imagery, night driving, and retro-futurism.' }
  ],
  [Genre.CUSTOM]: [
    { id: 'versatile', name: 'Versatile Writer', prompt: 'You are a highly versatile, professional songwriter capable of adapting to any style. Focus on strong structure, clear messaging, and engaging phrasing.' }
  ]
};
