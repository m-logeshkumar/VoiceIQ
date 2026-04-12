import { Router } from 'express';
import { analyzeJam, analyzeListening, analyzeReading } from '../controllers/assessmentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/reading', requireAuth, analyzeReading);
router.post('/listening', requireAuth, analyzeListening);
router.post('/jam', requireAuth, analyzeJam);

export default router;
