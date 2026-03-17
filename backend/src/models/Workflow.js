import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    version: { type: Number, default: 1 },
    is_active: { type: Boolean, default: true },
    input_schema: { type: mongoose.Schema.Types.Mixed, default: {} },
    start_step_id: { type: String, default: null },
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Workflow', workflowSchema);
