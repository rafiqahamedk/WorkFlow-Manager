import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    workflow_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
    name: { type: String, required: true },
    step_type: { type: String, enum: ['task', 'approval', 'notification'], required: true },
    order: { type: Number, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    approver_email: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Step', stepSchema);
