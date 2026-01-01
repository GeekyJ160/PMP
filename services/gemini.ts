
import { GoogleGenAI, Type } from "@google/genai";
import { Genre, LyricSuggestion, InstrumentalData } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLyricSuggestions = async (
  context: string,
  genre: Genre,
  instrumental?: InstrumentalData | null,
  artistMode?: boolean
): Promise<LyricSuggestion[]> => {
  const ai = getAI();
  const bpm = instrumental?.bpm;
  const key = instrumental?.key;
  const energy = instrumental?.energy;
  const vibes = instrumental?.vibe?.join(', ');

  const persona = artistMode 
    ? "Act as an elite introspective R&B/Rap superstar like Drake. Use clever wordplay, emotional transparency, and references to city life. Prioritize melodic rap cadences."
    : `Act as a world-class ${genre} songwriter.`;

  const musicContext = `
    Musical Blueprint:
    - Tempo: ${bpm || '90'} BPM
    - Key: ${key || 'Unknown'}
    - Energy Level: ${energy || 'Medium'}
    - Vibes: ${vibes || 'Standard'}
  `;

  const prompt = `${persona}
  ${musicContext}
  Based on this lyrical context: "${context}", generate 5 unique suggestions.
  Suggestions MUST match the rhythmic pocket of ${bpm || 90} BPM and the mood of the vibes: ${vibes || 'general'}.
  Include varied types: rhymes, flow completions, metaphors, or punchlines.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['rhyme', 'flow', 'metaphor', 'punchline', 'hook'] },
              score: { type: Type.NUMBER },
              rating: { type: Type.NUMBER }
            },
            required: ["text", "type", "score", "rating"]
          }
        }
      }
    });

    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Lyric AI Error:", error);
    return [];
  }
};

export const getRhymeSuggestions = async (
  word: string, 
  genre: Genre, 
  contextSnippet: string,
  bpm?: number | null
): Promise<string[]> => {
  const ai = getAI();
  if (!word || word.length < 2) return [];
  
  const tempoContext = bpm ? `${bpm} BPM` : "an unknown tempo";
  
  const prompt = `
    System: You are a legendary ${genre} songwriter and vocal arranger. 
    Task: Generate high-tier rhyme suggestions for the word: "${word}".
    
    Contextual Brief:
    - Current Verse Snippet: "${contextSnippet}"
    - Musical Tempo: ${tempoContext}
    - Style Guide: ${genre === Genre.RAP ? 'Prioritize internal rhymes, multi-syllabic schemes, and slant rhymes.' : 'Prioritize clean, melodic end-rhymes and emotional resonance.'}
    
    Requirements:
    1. Suggestions must maintain the rhythmic "pocket" of ${tempoContext}.
    2. Words must be semantically coherent with the surrounding lyrical context.
    3. Provide a mix of perfect rhymes and stylistic slant rhymes appropriate for ${genre}.
    
    Return exactly 16 suggestions as a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    console.error("Rhyme AI Error:", error);
    return [];
  }
};

export const analyzeInstrumental = async (base64Audio: string, mimeType: string): Promise<any> => {
  const ai = getAI();
  const prompt = `
    SYSTEM: You are an expert music producer and waveform analyst.
    TASK: Analyze the provided audio file and extract precise musical metadata.
    
    REQUIRED DATA:
    1. BPM: The precise beats per minute (Number).
    2. Key: The musical key and scale, e.g., 'A Minor' (String).
    3. Energy: A score from 1-100 based on transient density and spectral intensity (Number).
    4. Vibe: Exactly 4 descriptive tags, e.g., ['Spacey', 'Aggressive', 'Melancholic', 'Club'] (Array of Strings).
    
    Format: Return ONLY a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.NUMBER },
            key: { type: Type.STRING },
            energy: { type: Type.NUMBER },
            vibe: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["bpm", "key", "energy", "vibe"]
        }
      }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (err) {
    console.error("Analysis Failure:", err);
    return null;
  }
};
