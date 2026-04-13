import { Score } from '../models/Score.js';
import { User } from '../models/User.js';

function toDayKeyUTC(date) {
  return date.toISOString().slice(0, 10);
}

function getYesterdayKeyUTC(now = new Date()) {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDayKeyUTC(d);
}

export async function saveScore(req, res) {
  const score = await Score.create(req.body);

  let streak = null;
  const user = await User.findById(req.body.userId);
  if (user) {
    const todayKey = toDayKeyUTC(new Date());
    const lastKey = user.lastAssessmentDate ? toDayKeyUTC(new Date(user.lastAssessmentDate)) : null;

    if (!lastKey) {
      user.streak = 1;
    } else if (lastKey === todayKey) {
      // Same-day attempts should not increment streak.
      user.streak = Math.max(user.streak || 0, 1);
    } else if (lastKey === getYesterdayKeyUTC()) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1;
    }

    user.lastAssessmentDate = new Date();
    await user.save();
    streak = user.streak;
  }

  return res.status(201).json({ score, streak });
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

export async function deleteScore(req, res) {
  const { id } = req.params;
  const deleted = await Score.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Assessment result not found' });
  }
  return res.status(204).send();
}
