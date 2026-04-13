import { Router } from 'express';
import { deleteScore, getAllScores, getLeaderboard, getUserScores, saveScore } from '../controllers/scoreController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, saveScore);
router.get('/user/:userId', requireAuth, getUserScores);
router.get('/', requireAuth, getAllScores);
router.get('/leaderboard', requireAuth, getLeaderboard);
router.delete('/:id', requireAuth, requireAdmin, deleteScore);

export default router;
