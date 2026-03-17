import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema(
  {
    step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: true },
    condition: { type: String, required: true }, // e.g. "amount > 100 && country == 'US'" or "DEFAULT"
    next_step_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', default: null }, // null = end workflow
    priority: { type: Number, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Rule', ruleSchema);
