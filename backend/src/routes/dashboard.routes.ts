import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/data', authenticate, getDashboardData);

export default router;
