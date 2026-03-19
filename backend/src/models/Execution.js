import mongoose from 'mongoose';

const approvalHistorySchema = new mongoose.Schema(
  {
    step_id: String,
    step_name: String,
    approver_email: String,
    action: { type: String, enum: ['approved', 'rejected'] },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const stepLogSchema = new mongoose.Schema(
  {
    step_id: String,
    step_name: String,
    step_type: String,
    evaluated_rules: [
      {
        rule: String,
        result: Boolean,
        error: { type: String, default: null },
      },
    ],
    selected_next_step: { type: String, default: null },
    next_step_id: { type: String, default: null },   // actual ObjectId string for traversal
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'] },
    approver_id: { type: String, default: null },
    error_message: { type: String, default: null },
    started_at: Date,
    ended_at: { type: Date, default: null },
  },
  { _id: false }
);

const executionSchema = new mongoose.Schema(
  {
    workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
    workflow_version: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
      default: 'pending',
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    logs: { type: [stepLogSchema], default: [] },
    current_step_id: { type: String, default: null },
    retries: { type: Number, default: 0 },
    triggered_by: { type: String, default: 'anonymous' },
    started_at: { type: Date, default: null },
    ended_at: { type: Date, default: null },
    approval_token: { type: String, default: null },
    approval_token_step_id: { type: String, default: null },
    approval_token_expires_at: { type: Date, default: null },
    approval_history: { type: [approvalHistorySchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Execution', executionSchema);
