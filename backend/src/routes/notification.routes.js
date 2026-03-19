import { Router } from 'express';
import { listNotifications, markAllRead, clearAll } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', listNotifications);
router.post('/read-all', markAllRead);
router.delete('/', clearAll);

export default router;
