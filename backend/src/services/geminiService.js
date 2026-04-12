import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

function fallbackLevel(score) {
  if (score >= 86) return 'Expert';
  if (score >= 66) return 'Advanced';
  if (score >= 41) return 'Intermediate';
  return 'Beginner';
}

function buildFallbackResult(kind) {
  const overallScore = 65;

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
      mistakes: ['Using fallback analysis because Gemini API key is not configured.'],
      tips: ['Set GEMINI_API_KEY in backend/.env for AI-powered feedback.'],
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
      mistakes: ['Using fallback analysis because Gemini API key is not configured.'],
      tips: ['Set GEMINI_API_KEY in backend/.env for AI-powered feedback.'],
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
    mistakes: ['Using fallback analysis because Gemini API key is not configured.'],
    tips: ['Set GEMINI_API_KEY in backend/.env for AI-powered feedback.'],
    performanceLevel: fallbackLevel(overallScore),
  };
}

export async function analyzeWithGemini(kind, payload) {
  if (!env.geminiApiKey) {
    return buildFallbackResult(kind);
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an English speaking assessment engine.\nReturn ONLY JSON.\nAssessment type: ${kind}.\nPayload: ${JSON.stringify(payload)}\n\nRules:\n- Score values must be integers 0-100.\n- Include actionable tips array.\n- Include performanceLevel with one of: Beginner, Intermediate, Advanced, Expert.\n- For reading/listening include mispronounced and missedWords arrays.\n`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const normalized = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  return JSON.parse(normalized);
}
