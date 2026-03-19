import { Router } from 'express';
import { updateRule, deleteRule } from '../controllers/rule.controller.js';
import { validate } from '../middleware/validate.js';
import { ruleSchema } from '../middleware/schemas.js';

const router = Router();

router.put('/:id', validate(ruleSchema), updateRule);
router.delete('/:id', deleteRule);

export default router;
