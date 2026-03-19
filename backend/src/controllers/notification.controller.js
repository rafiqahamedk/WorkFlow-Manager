import Notification from '../models/Notification.js';

// GET /notifications — list for current user, latest first
export async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);
    const unread = await Notification.countDocuments({ user_id: req.user.id, read: false });
    res.json({ data: notifications, unread });
  } catch (err) {
    next(err);
  }
}

// POST /notifications/read-all — mark all as read
export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ user_id: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /notifications — clear all
export async function clearAll(req, res, next) {
  try {
    await Notification.deleteMany({ user_id: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
