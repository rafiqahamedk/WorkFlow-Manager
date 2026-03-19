import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_email:   { type: String, required: true },
    message:      { type: String, required: true },
    type:         { type: String, enum: ['success', 'error', 'info'], default: 'info' },
    execution_id: { type: String, default: null },
    read:         { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model('Notification', notificationSchema);
