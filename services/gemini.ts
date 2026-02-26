
import { GoogleGenAI, Type } from "@google/genai";
import { Genre, LyricSuggestion, InstrumentalData, GENRE_PERSONAS } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getLyricSuggestions = async (
  context: string,
  genre: Genre,
  instrumental?: InstrumentalData | null,
  artistMode?: boolean,
  subPersonaId?: string
): Promise<LyricSuggestion[]> => {
  const ai = getAI();
  const bpm = instrumental?.bpm || 90;
  const key = instrumental?.key || "Unknown";
  const energy = instrumental?.energy || 50;
  const vibes = instrumental?.vibe?.join(', ') || "neutral";

  let persona = "";
  if (artistMode) {
    persona = "You are a multi-platinum, award-winning ghostwriter. Your writing is complex, utilizing sophisticated multi-syllabic rhymes, intricate internal rhyme schemes, and deep thematic cohesion. You write lyrics that are critically acclaimed and commercially successful.";
  } else {
    const genrePersonas = GENRE_PERSONAS[genre] || GENRE_PERSONAS[Genre.CUSTOM];
    const selectedPersona = genrePersonas.find(p => p.id === subPersonaId) || genrePersonas[0];
    persona = `You are a ${selectedPersona.name}. ${selectedPersona.prompt}`;
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
    
    TASK: Provide 5 highly diverse, creative, and high-impact lyrical suggestions that logically follow or creatively contrast with the context. 
    Ensure variety in the types of suggestions. Include:
    1. A clever punchline or intricate wordplay.
    2. A vivid metaphor or strong sensory imagery.
    3. A rhythmic flow switch or unexpected cadence change.
    4. A thematic continuation or emotional escalation.
    5. A catchy hook element or memorable phrase.
    
    Make the suggestions unique, avoiding clichés and predictable rhymes. Push the boundaries of the genre.
    Output strictly in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.9,
        topP: 0.95,
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
    [Genre.ROCK]: "Use a mix of strong, direct rhymes and more abstract, metaphorical connections. The tone should be energetic and resonant.",
    [Genre.COUNTRY]: "Focus on clear, narrative-friendly rhymes that feel natural and conversational. Perfect rhymes are common but should feel earned.",
    [Genre.METAL]: "Prioritize dark, evocative rhymes and complex, multi-syllabic structures that match the intensity of the genre.",
    [Genre.JAZZ]: "Emphasize sophisticated, often unexpected rhymes and internal assonance that feels improvisational and smooth.",
    [Genre.ELECTRONIC]: "Focus on rhythmic, repetitive rhymes and technological or atmospheric word choices that blend with synthesized sounds.",
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
    Generate a list of 16 high-quality, highly creative rhyme suggestions for the target word. 
    Ensure the rhymes feel natural within the provided context snippet. 
    Include a diverse mix:
    - Perfect rhymes
    - Slant rhymes / Assonance
    - Multi-syllabic combinations (e.g., matching the vowel sounds of multiple syllables)
    - Unexpected or clever word choices that fit the genre.
    
    Avoid basic, predictable rhymes (like cat/hat) unless absolutely necessary for the context.

    RESPONSE FORMAT: 
    Strict JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-latest",
      contents: { parts: [{ text: prompt }] },
      config: {
        temperature: 0.85,
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
  
  // Comprehensive MIME type normalization for Gemini API compatibility
  let normalizedMime = mimeType.toLowerCase();
  
  if (normalizedMime.includes('audio/mpeg') || normalizedMime.includes('audio/mp3')) {
    normalizedMime = 'audio/mpeg';
  } else if (normalizedMime.includes('audio/wav') || normalizedMime.includes('audio/x-wav')) {
    normalizedMime = 'audio/wav';
  } else if (normalizedMime.includes('audio/aac') || normalizedMime.includes('audio/x-aac')) {
    normalizedMime = 'audio/aac';
  } else if (normalizedMime.includes('audio/m4a') || normalizedMime.includes('audio/mp4') || normalizedMime.includes('audio/x-m4a')) {
    // M4A files are technically MP4 containers, but Gemini often prefers audio/aac or audio/mp4
    normalizedMime = 'audio/aac'; 
  } else if (normalizedMime.includes('audio/aiff') || normalizedMime.includes('audio/x-aiff')) {
    normalizedMime = 'audio/aiff';
  } else if (normalizedMime.includes('audio/ogg')) {
    normalizedMime = 'audio/ogg';
  } else if (normalizedMime.includes('audio/flac')) {
    normalizedMime = 'audio/flac';
  } else {
    // Default fallback if unknown, usually audio/mpeg is a safe bet for generic compressed audio
    normalizedMime = 'audio/mpeg';
  }
  
  const prompt = `
    ROLE: You are an elite Musicologist and Digital Signal Processing (DSP) expert. 
    TASK: Perform a deep structural analysis of the provided audio file.
    
    FOCUS AREAS:
    1. BPM: Identify the tempo by analyzing the transient peak intervals (the "heartbeat" of the track). If double-time or half-time is possible, provide the most likely intended BPM.
    2. KEY: Determine the musical key (tonic and scale) by analyzing harmonic density and recurring melodic intervals. Use standard notation (e.g., "A minor", "F# major").
    3. ENERGY: Quantify the rhythmic intensity and spectral brightness on a scale of 1-100.
    4. VIBE: Identify 4 keywords that describe the soundscape (e.g., "Gritty", "Ethereal", "Aggressive", "Soulful").
    
    IMPORTANT: Provide only the most probable results. If unsure about BPM, default to the detected primary beat frequency. Be precise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
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
            bpm: { type: Type.INTEGER, description: "Beats per minute, must be between 40 and 220." },
            key: { type: Type.STRING, description: "Musical key, e.g. 'C minor' or 'G major'." },
            energy: { type: Type.INTEGER, description: "Intensity score from 1-100." },
            vibe: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 descriptive vibe words." }
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
