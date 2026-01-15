
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

  let persona = "";
  if (artistMode) {
    persona = "You are a multi-platinum, award-winning ghostwriter. Your writing is complex, utilizing sophisticated multi-syllabic rhymes, intricate internal rhyme schemes, and deep thematic cohesion.";
  } else {
    switch (genre) {
      case Genre.RAP:
        persona = "You are a veteran battle rapper and lyricist. Focus on heavy punchlines, wordplay, and rhythmic variety.";
        break;
      case Genre.POP:
        persona = "You are a professional hit-making pop songwriter. Focus on catchy imagery and relatable emotional hooks.";
        break;
      case Genre.RNB:
        persona = "You are a soulful R&B songwriter. Focus on emotional vulnerability and smooth cadences.";
        break;
      default:
        persona = "You are a professional versatile songwriter.";
    }
  }

  const musicalGrounding = instrumental ? `
    MUSICAL CONSTRAINTS:
    - Tempo: ${bpm} BPM.
    - Key/Scale: ${key}.
    - Energy Level: ${energy}/100.
    - Vibe Profile: ${vibes}.
  ` : `- Standard Tempo: 90 BPM.`;

  const prompt = `
    SYSTEM: ${persona}
    ${musicalGrounding}
    
    CURRENT LYRICAL CONTEXT: "${context}"
    
    TASK: Provide 5 high-impact lyrical suggestions that logically follow the context.
    Output strictly in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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

  const genreInstructions: Record<Genre, string> = {
    [Genre.RAP]: "Prioritize multi-syllabic rhymes, internal rhymes, and slant rhymes (assonance). The tone should be sharp and rhythmically dense.",
    [Genre.POP]: "Focus on perfect rhymes, catchy phonetics, and clear, simple sounds that work well in a melodic hook.",
    [Genre.RNB]: "Emphasize smooth, vowel-heavy rhymes that allow for vocal runs and emotional expression.",
    [Genre.CUSTOM]: "Provide a wide experimental variety of rhymes that bridge various musical styles."
  };

  const tempoContext = bpm ? `The track is at ${bpm} BPM. Rhymes should match this pace—shorter, punchier rhymes for high BPM; longer, more complex vowels for lower BPM.` : "Standard 90 BPM pace.";

  const prompt = `
    ROLE: You are an expert Rhyme Architect and Lyricist.
    GENRE: ${genre}
    TARGET WORD: "${word}"
    LYRICAL CONTEXT: "...${contextSnippet}..."
    TEMPO: ${tempoContext}

    GENRE GUIDELINES:
    ${genreInstructions[genre]}

    TASK:
    Generate a list of 16 high-quality rhyme suggestions for the target word. 
    Ensure the rhymes feel natural within the provided context snippet. 
    Include a mix of perfect rhymes, slant rhymes, and multi-syllabic combinations where appropriate.

    RESPONSE FORMAT: 
    Strict JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
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
  
  // Normalize MIME types for Gemini. Browsers often use audio/mp3, but audio/mpeg is the standard IANA type.
  let normalizedMime = mimeType;
  if (mimeType === 'audio/mp3') normalizedMime = 'audio/mpeg';
  if (mimeType === 'audio/x-m4a' || mimeType === 'audio/m4a') normalizedMime = 'audio/aac';
  
  const prompt = `
    Act as a senior audio engineer and musicologist. 
    Listen to this audio clip and accurately determine:
    1. BPM (Beats Per Minute) as an integer.
    2. Musical Key (e.g., 'C minor', 'G# major').
    3. Energy Level (1-100).
    4. 4 descriptive vibe keywords.
    
    Be precise. If it is an upbeat track, the BPM should reflect the actual tempo, not a default.
    Return strictly as JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ 
        parts: [
          { inlineData: { mimeType: normalizedMime, data: base64Audio } }, 
          { text: prompt }
        ] 
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.INTEGER },
            key: { type: Type.STRING },
            energy: { type: Type.INTEGER },
            vibe: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["bpm", "key", "energy", "vibe"]
        }
      }
    });
    
    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (err) {
    console.error("Gemini Audio Analysis Error:", err);
    return null;
  }
};
