import { Router } from 'express';
import {
  getExecution,
  listExecutions,
  cancelExecution,
  retryExecution,
  approveStep,
} from '../controllers/execution.controller.js';

const router = Router();

router.get('/', listExecutions);
router.get('/:id', getExecution);
router.post('/:id/cancel', cancelExecution);
router.post('/:id/retry', retryExecution);
router.post('/:id/approve', approveStep);

export default router;
