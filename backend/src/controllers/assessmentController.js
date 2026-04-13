import { analyzeWithGemini, getGeminiStatus } from '../services/geminiService.js';

export async function getAiStatus(_req, res) {
  const status = await getGeminiStatus();
  return res.json({ status });
}

export async function analyzeReading(req, res) {
  const result = await analyzeWithGemini('reading', req.body);
  return res.json({ result });
}

export async function analyzeListening(req, res) {
  const result = await analyzeWithGemini('listening', req.body);
  return res.json({ result });
}

export async function analyzeJam(req, res) {
  const result = await analyzeWithGemini('jam', req.body);
  return res.json({ result });
}
