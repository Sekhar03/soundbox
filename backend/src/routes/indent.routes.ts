import { Router } from 'express';
import { 
  getIndents, 
  createIndent, 
  updateIndentStatus, 
  getIndentById 
} from '../controllers/indent.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getIndents);
router.get('/:id', authenticate, getIndentById);
router.post('/', authenticate, authorize(['ADMIN', 'OPERATIONS']), createIndent);
router.put('/:id/status', authenticate, authorize(['ADMIN', 'OPERATIONS', 'CALLING', 'COURIER']), updateIndentStatus);

export default router;
