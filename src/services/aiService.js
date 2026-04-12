import { apiRequest } from './apiClient';

function getPerformanceLevel(score) {
  if (score >= 86) return 'Expert';
  if (score >= 66) return 'Advanced';
  if (score >= 41) return 'Intermediate';
  return 'Beginner';
}

export async function analyzeReading(transcript, referenceText) {
  const { result } = await apiRequest('/assessments/reading', {
    method: 'POST',
    body: JSON.stringify({ transcript, referenceText }),
  }, true);

  if (!result.performanceLevel && typeof result.overallScore === 'number') {
    result.performanceLevel = getPerformanceLevel(result.overallScore);
  }

  return result;
}

export async function analyzeListening(transcript, originalText) {
  const { result } = await apiRequest('/assessments/listening', {
    method: 'POST',
    body: JSON.stringify({ transcript, originalText }),
  }, true);

  if (!result.performanceLevel && typeof result.overallScore === 'number') {
    result.performanceLevel = getPerformanceLevel(result.overallScore);
  }

  return result;
}

export async function analyzeJAM(transcript, topic) {
  const { result } = await apiRequest('/assessments/jam', {
    method: 'POST',
    body: JSON.stringify({ transcript, topic }),
  }, true);

  if (!result.performanceLevel && typeof result.overallScore === 'number') {
    result.performanceLevel = getPerformanceLevel(result.overallScore);
  }

  return result;
}

export function generateFinalReport(readingResult, listeningResult, jamResult) {
  const scores = {
    reading: readingResult?.overallScore || 0,
    listening: listeningResult?.overallScore || 0,
    speaking: jamResult?.overallScore || 0,
  };
  
  const overall = Math.round((scores.reading + scores.listening + scores.speaking) / 3);
  
  const strengths = [];
  const weaknesses = [];
  
  if (scores.reading >= 70) strengths.push('Reading & Pronunciation');
  else weaknesses.push('Reading & Pronunciation');
  if (scores.listening >= 70) strengths.push('Listening & Comprehension');
  else weaknesses.push('Listening & Comprehension');
  if (scores.speaking >= 70) strengths.push('Speaking & Fluency');
  else weaknesses.push('Speaking & Fluency');

  const allTips = [
    ...(readingResult?.tips || []),
    ...(listeningResult?.tips || []),
    ...(jamResult?.tips || []),
  ];

  return {
    overall,
    performanceLevel: getPerformanceLevel(overall),
    scores,
    pronunciation: readingResult?.pronunciation || 0,
    fluency: Math.round(((readingResult?.fluency || 0) + (jamResult?.fluency || 0)) / 2),
    listening: listeningResult?.listeningScore || 0,
    confidence: Math.round(((readingResult?.confidence || 0) + (jamResult?.confidence || 0)) / 2),
    vocabulary: jamResult?.vocabulary || 0,
    grammar: Math.round(((readingResult?.grammarClarity || 0) + (jamResult?.grammar || 0)) / 2),
    strengths,
    weaknesses,
    tips: [...new Set(allTips)].slice(0, 6),
    date: new Date().toISOString(),
  };
}
