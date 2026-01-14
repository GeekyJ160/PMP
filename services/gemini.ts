
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
    ? "You are an elite ghostwriter. Your style is sophisticated, using complex internal rhymes and perfect rhythmic pocket placement."
    : `You are a professional ${genre} songwriter.`;

  const musicContext = instrumental ? `
    TRACK DATA:
    - Tempo: ${bpm} BPM
    - Scale: ${key}
    - Energy: ${energy}/100
    - Mood: ${vibes}
    
    INSTRUCTION: Every line must fit a 4/4 signature at ${bpm} BPM. 
    Emotional tone must align with ${vibes} in ${key}.
  ` : `- Base Tempo: 90 BPM (Standard)`;

  const prompt = `${persona}\n${musicContext}\nCURRENT DRAFT: "${context}"\nTASK: Generate 5 lyrical suggestions in JSON format.`;

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
  
  const prompt = `Find 16 high-quality rhymes or slant-rhymes for "${word}" at ${bpm || 90} BPM for a ${genre} track. Return as JSON string array.`;

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
  const prompt = `Analyze audio: bpm (int), key (string), energy (1-100), vibe (4 keywords). Format: JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
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
