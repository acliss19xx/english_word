const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const CHECK_MODEL = "gemini-2.5-flash-preview-04-17";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

// Exponential backoff retry
async function fetchWithRetry(url, options, maxRetries = 5) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // Retry on 401, 429, 5xx
      if (response.status === 401 || response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
      } else {
        // Non-retryable error
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }
    } catch (err) {
      // Network errors - retry
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Check if a user's answer is correct for the given English word.
 * @param {string} word - The English word
 * @param {string} userAnswer - The user's Japanese answer
 * @returns {Promise<{correct: boolean, explanation: string}>}
 */
export async function checkAnswer(word, userAnswer) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHECK_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `英単語「${word}」の意味として、「${userAnswer}」は正しいですか？類義語や多少の表現の違いは許容してください。JSONで{"correct": true/false, "explanation": "簡単な日本語説明"}を返してください。`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Invalid response from Gemini API");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}

/**
 * Generate TTS audio for the given word using Gemini TTS API.
 * @param {string} word - The English word to pronounce
 * @returns {Promise<HTMLAudioElement>} - Audio element ready to play
 */
export async function generateTTS(word) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: word }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore",
          },
        },
      },
    },
  };

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

  if (!inlineData) {
    throw new Error("No audio data in TTS response");
  }

  const { data: base64Audio, mimeType } = inlineData;
  const audioMimeType = mimeType || "audio/wav";

  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: audioMimeType });
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  return audio;
}

/**
 * Play TTS audio for the given word.
 * @param {string} word
 * @returns {Promise<void>}
 */
export async function speakWord(word) {
  const audio = await generateTTS(word);
  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audio.src);
      reject(e);
    };
    audio.play().catch(reject);
  });
}
