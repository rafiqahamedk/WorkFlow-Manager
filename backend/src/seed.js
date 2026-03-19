/**
 * Seed script — creates 2 sample workflows with steps and rules.
 * Run: node src/seed.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Workflow from './models/Workflow.js';
import Step from './models/Step.js';
import Rule from './models/Rule.js';

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/workflow_manager');
  console.log('Connected. Seeding...');

  // Clear existing
  await Promise.all([Workflow.deleteMany(), Step.deleteMany(), Rule.deleteMany()]);

  // ── Workflow 1: Expense Approval ──────────────────────────────────────────
  const wf1 = await Workflow.create({
    name: 'Expense Approval',
    description: 'Multi-level expense approval process',
    version: 1,
    is_active: true,
    input_schema: {
      amount: { type: 'number', required: true },
      country: { type: 'string', required: true },
      department: { type: 'string', required: false },
      priority: { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] },
    },
  });

  const [managerApproval, financeNotif, ceoApproval, taskRejection] = await Step.insertMany([
    { workflow_id: wf1._id, name: 'Manager Approval', step_type: 'approval', order: 0, metadata: { assignee_email: 'manager@example.com' } },
    { workflow_id: wf1._id, name: 'Finance Notification', step_type: 'notification', order: 1, metadata: { notification_channel: 'email', template: 'finance_alert' } },
    { workflow_id: wf1._id, name: 'CEO Approval', step_type: 'approval', order: 2, metadata: { assignee_email: 'ceo@example.com' } },
    { workflow_id: wf1._id, name: 'Task Rejection', step_type: 'task', order: 3, metadata: { instructions: 'Notify requester of rejection' } },
  ]);

  wf1.start_step_id = String(managerApproval._id);
  await wf1.save();

  // Rules for Manager Approval
  await Rule.insertMany([
    { step_id: managerApproval._id, condition: 'amount > 100 && country == "US" && priority == "High"', next_step_id: financeNotif._id, priority: 1 },
    { step_id: managerApproval._id, condition: 'amount <= 100', next_step_id: ceoApproval._id, priority: 2 },
    { step_id: managerApproval._id, condition: 'priority == "Low" && country != "US"', next_step_id: taskRejection._id, priority: 3 },
    { step_id: managerApproval._id, condition: 'DEFAULT', next_step_id: taskRejection._id, priority: 4 },
  ]);

  // Rules for Finance Notification (auto-complete → end)
  await Rule.insertMany([
    { step_id: financeNotif._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  // Rules for CEO Approval
  await Rule.insertMany([
    { step_id: ceoApproval._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  // Rules for Task Rejection
  await Rule.insertMany([
    { step_id: taskRejection._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  // ── Workflow 2: Employee Onboarding ───────────────────────────────────────
  const wf2 = await Workflow.create({
    name: 'Employee Onboarding',
    description: 'New hire onboarding process',
    version: 1,
    is_active: true,
    input_schema: {
      department: { type: 'string', required: true, allowed_values: ['Engineering', 'HR', 'Finance', 'Sales'] },
      role: { type: 'string', required: true },
      remote: { type: 'boolean', required: false },
    },
  });

  const [sendWelcome, setupAccess, hrApproval] = await Step.insertMany([
    { workflow_id: wf2._id, name: 'Send Welcome Email', step_type: 'notification', order: 0, metadata: { notification_channel: 'email', template: 'welcome' } },
    { workflow_id: wf2._id, name: 'Setup System Access', step_type: 'task', order: 1, metadata: { instructions: 'Create accounts in Jira, Slack, GitHub' } },
    { workflow_id: wf2._id, name: 'HR Final Approval', step_type: 'approval', order: 2, metadata: { assignee_email: 'hr@example.com' } },
  ]);

  wf2.start_step_id = String(sendWelcome._id);
  await wf2.save();

  await Rule.insertMany([
    { step_id: sendWelcome._id, condition: 'DEFAULT', next_step_id: setupAccess._id, priority: 1 },
    { step_id: setupAccess._id, condition: 'department == "Engineering"', next_step_id: hrApproval._id, priority: 1 },
    { step_id: setupAccess._id, condition: 'DEFAULT', next_step_id: null, priority: 2 },
    { step_id: hrApproval._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  console.log('Seeded successfully:');
  console.log('  - Expense Approval (4 steps, rules on Manager Approval)');
  console.log('  - Employee Onboarding (3 steps)');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
