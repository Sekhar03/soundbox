import { Router } from 'express';
import { generateInventoryReport } from '../controllers/report.controller';

const router = Router();

router.get('/inventory', generateInventoryReport);

export default router;
