import { Router } from 'express';
import { updateStep, deleteStep } from '../controllers/step.controller.js';
import { addRule, listRules } from '../controllers/rule.controller.js';
import { validate } from '../middleware/validate.js';
import { stepSchema, ruleSchema } from '../middleware/schemas.js';

const router = Router();

router.put('/:id', validate(stepSchema), updateStep);
router.delete('/:id', deleteStep);

// Rules nested under step
router.post('/:step_id/rules', validate(ruleSchema), addRule);
router.get('/:step_id/rules', listRules);

export default router;
