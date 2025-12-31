
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

  const persona = artistMode 
    ? "Act as an elite introspective R&B/Rap superstar like Drake. Use clever wordplay, emotional transparency, and references to city life. Prioritize melodic rap cadences."
    : `Act as a world-class ${genre} songwriter.`;

  const prompt = `${persona}
  ${bpm ? `Tempo: ${bpm} BPM.` : ''} ${key ? `Key: ${key}.` : ''}
  Based on this context: "${context}", generate 5 unique suggestions.
  Include varied types: rhymes, flow completions, metaphors, or punchlines.
  The suggestions must match the rhythm of ${bpm || 90} BPM.`;

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
              type: { type: Type.STRING },
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
  
  const prompt = `Act as an elite ${genre} lyricist. 
  Word to rhyme: "${word}"
  Context of surrounding lyrics: "${contextSnippet}"
  Track Tempo: ${bpm ? bpm : 'Variable'}
  
  Task: Provide 16 rhymes. 
  Crucial: The rhymes must make sense within the theme of the context snippet. 
  Return as a simple JSON array of strings.`;

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
  const prompt = `Analyze this instrumental. Extract BPM (number), Key (string), Energy (1-100), and Vibe (array of 4 tags). Return as JSON.`;

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
    return null;
  }
};
