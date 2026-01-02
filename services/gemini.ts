
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
  const bpm = instrumental?.bpm || 90;
  const key = instrumental?.key || "Unknown";
  const energy = instrumental?.energy || 50;
  const vibes = instrumental?.vibe?.join(', ') || "neutral";

  const persona = artistMode 
    ? "You are an elite, multi-platinum ghostwriter. Your style is sophisticated, using complex internal rhymes, double entendres, and perfect rhythmic 'pocket' placement."
    : `You are a professional ${genre} songwriter known for creating commercially successful records.`;

  const musicContext = instrumental ? `
    TRACK CALIBRATION DATA:
    - Tempo: ${bpm} BPM
    - Scale: ${key}
    - Energy Level: ${energy}/100
    - Sonic Vibes: ${vibes}
    
    INSTRUCTION: Every bar must be rhythmically compatible with a 4/4 signature at ${bpm} BPM.
    The emotional tone must resonate with the "${vibes}" atmosphere and the "${key}" musical scale.
    Match the vocabulary and intensity to the energy level of ${energy}.
  ` : `- Base Tempo: 90 BPM (Standard 4/4)`;

  const prompt = `${persona}
  ${musicContext}
  
  CURRENT WORK-IN-PROGRESS: "${context}"
  
  TASK: Provide 5 high-impact lyrical suggestions.
  For each suggestion, provide:
  - text: The lyrics/bars.
  - type: One of ['rhyme', 'flow', 'metaphor', 'punchline', 'hook'].
  - score: A "Rhythmic Sync" score (0-100) specifically calculated based on syllable count vs ${bpm} BPM.
  - rating: Creative quality rating (1-5).
  
  Format your response as a JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
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
  
  const prompt = `
    System: Professional Songwriting Lexicon.
    Context: Writing for ${genre} at ${bpm || 'unknown'} BPM.
    Target Word: "${word}"
    Lyric Segment: "${contextSnippet}"
    
    Task: Find 16 high-quality rhymes or slant-rhymes. 
    Ensure they fit the phonetic aesthetic of the genre.
    Return as a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    SYSTEM: You are a professional Audio Analyst.
    TASK: Perform a detailed musical analysis of this audio clip.
    
    REQUIRED DATA:
    1. bpm: Estimated Beats Per Minute (Integer).
    2. key: The musical key and scale (e.g., 'A Minor').
    3. energy: A scale of 1-100 representing dynamic intensity.
    4. vibe: Exactly 4 descriptive keywords characterizing the mood.
    
    Output as JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      contents: [{ 
        parts: [
          { inlineData: { mimeType, data: base64Audio } }, 
          { text: prompt }
        ] 
      }],
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
    console.error("Analysis Error:", err);
    return null;
  }
};
