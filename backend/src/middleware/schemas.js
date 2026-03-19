import { z } from 'zod';

export const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  input_schema: z.record(z.any()).optional(),
  start_step_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const stepSchema = z.object({
  name: z.string().min(1),
  step_type: z.enum(['task', 'approval', 'notification']),
  order: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional(),
  approver_email: z.string().email().nullable().optional(),
});

export const ruleSchema = z.object({
  condition: z.string().min(1),
  next_step_id: z.string().nullable().optional(),
  priority: z.number().int().min(1),
});

export const executeSchema = z.object({
  data: z.record(z.any()),
  triggered_by: z.string().optional(),
});
