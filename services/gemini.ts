
import { GoogleGenAI, Type } from "@google/genai";
import { Genre, LyricSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLyricSuggestions = async (
  context: string,
  genre: Genre,
  bpm?: number | null,
  key?: string | null
): Promise<LyricSuggestion[]> => {
  const prompt = `Act as a world-class ${genre} songwriter. 
  ${bpm ? `The track tempo is ${bpm} BPM.` : ''} ${key ? `The musical key is ${key}.` : ''}
  Based on the current context: "${context}", generate 5 unique lyric suggestions.
  Provide varied types: rhyme completions, flow improvements, deep metaphors, powerful punchlines, or catchy hooks.
  Maintain the artistic vibe of a modern top-tier artist. Ensure the rhythm of the suggestions fits the ${bpm || 90} BPM tempo.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING, description: "One of: rhyme, flow, metaphor, punchline, hook" },
              score: { type: Type.NUMBER, description: "Match score out of 100" },
              rating: { type: Type.NUMBER, description: "Star rating 1-5" }
            },
            required: ["text", "type", "score", "rating"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const getRhymeSuggestions = async (
  word: string, 
  genre: Genre, 
  contextSnippet: string,
  bpm?: number | null
): Promise<string[]> => {
  if (!word || word.length < 2) return [];
  
  const prompt = `Act as an award-winning ${genre} lyricist.
  The user is writing ${genre} lyrics and needs rhymes for the word: "${word}".
  Tempo: ${bpm || 'standard'}.
  Context: "${contextSnippet}"

  Task: Provide 12-16 rhyme suggestions that are stylistically and contextually relevant.
  For ${genre}, favor rhymes that fit a professional songwriting standard.
  Return ONLY a JSON array of strings.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      const rhymes = JSON.parse(response.text);
      return Array.isArray(rhymes) ? rhymes : [];
    }
    return [];
  } catch (error) {
    console.error("Rhyme Gemini Error:", error);
    return [];
  }
};

export const analyzeInstrumental = async (base64Audio: string): Promise<any> => {
  const prompt = `Analyze this instrumental audio track precisely. 
  Extract:
  1. BPM (Beats Per Minute) - provide a single integer.
  2. Musical Key (e.g., "G Minor", "C# Major") - be specific.
  3. Energy Level (Scale 1-100).
  4. Vibe Tags (e.g., "Melodic", "Dark", "Aggressive", "Soulful").
  
  Return the analysis as a JSON object.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: base64Audio
          }
        },
        { text: prompt }
      ],
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
    console.error("Instrumental Analysis Error:", err);
    return null;
  }
};

export const analyzeAudioCadence = async (base64Audio: string): Promise<any> => {
  const prompt = "Analyze the flow, rhyme density, and energy of this vocal performance. Return a numeric score for each.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rhymeScore: { type: Type.NUMBER },
            flowScore: { type: Type.NUMBER },
            energyScore: { type: Type.NUMBER },
            bpm: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["rhymeScore", "flowScore", "energyScore", "bpm", "feedback"]
        }
      }
    });
    return response.text ? JSON.parse(response.text) : null;
  } catch (err) {
    return null;
  }
};
