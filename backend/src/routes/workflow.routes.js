import { Router } from 'express';
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflow.controller.js';
import { addStep, listSteps } from '../controllers/step.controller.js';
import { startExecution } from '../controllers/execution.controller.js';
import { validate } from '../middleware/validate.js';
import { workflowSchema, stepSchema, executeSchema } from '../middleware/schemas.js';

const router = Router();

router.post('/', validate(workflowSchema), createWorkflow);
router.get('/', listWorkflows);
router.get('/:id', getWorkflow);
router.put('/:id', validate(workflowSchema), updateWorkflow);
router.delete('/:id', deleteWorkflow);

// Steps nested under workflow
router.post('/:workflow_id/steps', validate(stepSchema), addStep);
router.get('/:workflow_id/steps', listSteps);

// Execute
router.post('/:workflow_id/execute', validate(executeSchema), startExecution);

export default router;
