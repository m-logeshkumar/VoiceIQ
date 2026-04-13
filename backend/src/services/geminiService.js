import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const MODEL_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

function fallbackLevel(score) {
  if (score >= 86) return 'Expert';
  if (score >= 66) return 'Advanced';
  if (score >= 41) return 'Intermediate';
  return 'Beginner';
}

function buildFallbackResult(kind, reason = 'Gemini is currently unavailable.') {
  const overallScore = 65;
  const reasonText = `Using fallback analysis: ${reason}`;
  const tipText = 'Please try again shortly. If this persists, verify GEMINI_API_KEY and model availability for your region.';

  if (kind === 'reading') {
    return {
      overallScore,
      pronunciation: 64,
      fluency: 66,
      grammarClarity: 67,
      speechSpeed: 63,
      pausesHesitation: 62,
      confidence: 68,
      accentClarity: 64,
      wordStress: 63,
      mispronounced: [],
      missedWords: [],
      mistakes: [reasonText],
      tips: [tipText],
      performanceLevel: fallbackLevel(overallScore),
    };
  }

  if (kind === 'listening') {
    return {
      overallScore,
      listeningScore: 66,
      accuracy: 65,
      pronunciation: 64,
      fluency: 66,
      memoryRetention: 63,
      speechClarity: 67,
      accent: 64,
      mispronounced: [],
      missedWords: [],
      mistakes: [reasonText],
      tips: [tipText],
      performanceLevel: fallbackLevel(overallScore),
    };
  }

  return {
    overallScore,
    fluency: 66,
    vocabulary: 64,
    grammar: 65,
    confidence: 67,
    topicRelevance: 68,
    speakingFlow: 64,
    ideaClarity: 66,
    wordCount: 100,
    uniqueWordCount: 60,
    vocabLevel: 'Intermediate',
    mistakes: [reasonText],
    tips: [tipText],
    performanceLevel: fallbackLevel(overallScore),
  };
}

export async function analyzeWithGemini(kind, payload) {
  if (!env.geminiApiKey) {
    return buildFallbackResult(kind, 'GEMINI_API_KEY is missing.');
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);

  const prompt = `You are an English speaking assessment engine.\nReturn ONLY JSON.\nAssessment type: ${kind}.\nPayload: ${JSON.stringify(payload)}\n\nRules:\n- Score values must be integers 0-100.\n- Include actionable tips array.\n- Include performanceLevel with one of: Beginner, Intermediate, Advanced, Expert.\n- For reading/listening include mispronounced and missedWords arrays.\n`;

  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const normalized = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      return JSON.parse(normalized);
    } catch (err) {
      lastError = err;
    }
  }

  const reason = lastError?.message || 'No supported Gemini model responded successfully.';
  return buildFallbackResult(kind, reason);
}
