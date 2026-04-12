import { Score } from '../models/Score.js';

export async function saveScore(req, res) {
  const score = await Score.create(req.body);
  return res.status(201).json({ score });
}

export async function getUserScores(req, res) {
  const { userId } = req.params;
  const scores = await Score.find({ userId }).sort({ createdAt: -1 });
  return res.json({ scores });
}

export async function getAllScores(req, res) {
  const scores = await Score.find().sort({ createdAt: -1 });
  return res.json({ scores });
}

export async function getLeaderboard(req, res) {
  const { period = 'all' } = req.query;
  let scores = await Score.find().sort({ createdAt: -1 });

  if (period === 'weekly') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    scores = scores.filter((s) => s.createdAt >= weekAgo);
  }

  if (period === 'monthly') {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    scores = scores.filter((s) => s.createdAt >= monthAgo);
  }

  const byUser = {};
  for (const score of scores) {
    const key = score.userId;
    if (!byUser[key] || score.overall > byUser[key].overall) {
      byUser[key] = score;
    }
  }

  const leaderboard = Object.values(byUser).sort((a, b) => b.overall - a.overall);
  return res.json({ leaderboard });
}
