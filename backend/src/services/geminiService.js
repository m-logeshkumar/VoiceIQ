import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

let cachedStatus = null;
let lastStatusAt = 0;
const STATUS_TTL_MS = 5 * 60 * 1000;

function fallbackLevel(score) {
  if (score >= 86) return 'Expert';
  if (score >= 66) return 'Advanced';
  if (score >= 41) return 'Intermediate';
  return 'Beginner';
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function compareText(transcript, reference) {
  const spoken = words(transcript);
  const target = words(reference);
  const spokenSet = new Set(spoken);

  const correct = [];
  const missed = [];
  for (const w of target) {
    if (spokenSet.has(w)) correct.push(w);
    else missed.push(w);
  }

  const accuracy = target.length ? (correct.length / target.length) * 100 : 0;
  return { spoken, target, correct, missed, accuracy: clamp(accuracy) };
}

function buildFallbackResult(kind, payload = {}, reason = 'Gemini is currently unavailable.') {
  const reasonText = `Using fallback analysis: ${reason}`;
  const tipText = 'Use concise sentence structure, maintain steady pacing, articulate word endings, and self-correct immediately after slips to improve clarity and fluency.';

  if (kind === 'reading') {
    const { transcript = '', referenceText = '' } = payload;
    const cmp = compareText(transcript, referenceText);
    const overallScore = clamp(cmp.accuracy * 0.9 + 10);
    const pronunciation = clamp(overallScore - 2);
    const fluency = clamp(overallScore + (cmp.spoken.length > 20 ? 2 : -4));
    const grammarClarity = clamp(50 + overallScore * 0.45);
    const speechSpeed = clamp(45 + Math.min(cmp.spoken.length, 120) * 0.35);
    const pausesHesitation = clamp(fluency - 3);
    const confidence = clamp(fluency + 1);
    const accentClarity = clamp(pronunciation - 1);
    const wordStress = clamp(pronunciation - 2);

    return {
      overallScore,
      pronunciation,
      fluency,
      grammarClarity,
      speechSpeed,
      pausesHesitation,
      confidence,
      accentClarity,
      wordStress,
      mispronounced: [],
      missedWords: cmp.missed.slice(0, 10),
      mistakes: [reasonText, ...(cmp.missed.length ? [`Missed ${cmp.missed.length} word(s) from reference text.`] : [])],
      tips: [tipText, ...(fluency < 60 ? ['Practice reading aloud daily to improve fluency and pacing.'] : [])],
      performanceLevel: fallbackLevel(overallScore),
    };
  }

  if (kind === 'listening') {
    const { transcript = '', originalText = '' } = payload;
    const cmp = compareText(transcript, originalText);
    const overallScore = clamp(cmp.accuracy * 0.9 + 10);
    const listeningScore = clamp(overallScore + 1);
    const pronunciation = clamp(overallScore - 1);
    const fluency = clamp(overallScore);
    const memoryRetention = clamp(cmp.accuracy - 3);
    const speechClarity = clamp(50 + overallScore * 0.45);
    const accent = clamp(pronunciation - 2);

    return {
      overallScore,
      listeningScore,
      accuracy: cmp.accuracy,
      pronunciation,
      fluency,
      memoryRetention,
      speechClarity,
      accent,
      mispronounced: [],
      missedWords: cmp.missed.slice(0, 8),
      mistakes: [reasonText, ...(cmp.missed.length ? [`Missed ${cmp.missed.length} key word(s) from audio.`] : [])],
      tips: [tipText, ...(cmp.accuracy < 60 ? ['Replay audio and summarize key points before recording.'] : [])],
      performanceLevel: fallbackLevel(overallScore),
    };
  }

  const { transcript = '', topic = '' } = payload;
  const spoken = words(transcript);
  const unique = new Set(spoken);
  const topicWords = new Set(words(topic));
  const topicOverlap = spoken.filter((w) => topicWords.has(w)).length;
  const vocabRichness = spoken.length ? (unique.size / spoken.length) * 100 : 0;
  const flowBase = spoken.length >= 80 ? 75 : spoken.length >= 40 ? 62 : 48;
  const topicRelevance = clamp(45 + topicOverlap * 12);
  const overallScore = clamp((flowBase + vocabRichness * 0.4 + topicRelevance * 0.35) / 1.75);

  return {
    overallScore,
    fluency: clamp(flowBase),
    vocabulary: clamp(vocabRichness * 0.85 + 25),
    grammar: clamp(overallScore - 2),
    confidence: clamp(overallScore + 1),
    topicRelevance,
    speakingFlow: clamp(flowBase - 1),
    ideaClarity: clamp((topicRelevance + flowBase) / 2),
    wordCount: spoken.length,
    uniqueWordCount: unique.size,
    vocabLevel: vocabRichness > 70 ? 'Advanced' : vocabRichness > 45 ? 'Intermediate' : 'Basic',
    mistakes: [reasonText],
    tips: [tipText, ...(spoken.length < 50 ? ['Speak longer (at least 80-100 words) to improve score reliability.'] : [])],
    performanceLevel: fallbackLevel(overallScore),
  };
}

export async function analyzeWithGemini(kind, payload) {
  if (!env.geminiApiKey) {
    return buildFallbackResult(kind, payload, 'GEMINI_API_KEY is missing.');
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
  return buildFallbackResult(kind, payload, reason);
}

export async function getGeminiStatus(force = false) {
  const now = Date.now();
  if (!force && cachedStatus && now - lastStatusAt < STATUS_TTL_MS) {
    return cachedStatus;
  }

  if (!env.geminiApiKey) {
    cachedStatus = {
      ok: false,
      provider: 'gemini',
      mode: 'fallback',
      model: null,
      reason: 'GEMINI_API_KEY is missing.',
      checkedAt: new Date().toISOString(),
    };
    lastStatusAt = now;
    return cachedStatus;
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  let lastError = null;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Respond with exactly: OK');
      const text = result.response.text().trim();

      cachedStatus = {
        ok: text.toUpperCase().includes('OK'),
        provider: 'gemini',
        mode: text.toUpperCase().includes('OK') ? 'live' : 'fallback',
        model: modelName,
        reason: text.toUpperCase().includes('OK') ? 'Gemini responded successfully.' : `Unexpected response: ${text}`,
        checkedAt: new Date().toISOString(),
      };
      lastStatusAt = now;
      return cachedStatus;
    } catch (err) {
      lastError = err;
    }
  }

  cachedStatus = {
    ok: false,
    provider: 'gemini',
    mode: 'fallback',
    model: null,
    reason: lastError?.message || 'No supported Gemini model responded successfully.',
    checkedAt: new Date().toISOString(),
  };
  lastStatusAt = now;
  return cachedStatus;
}
