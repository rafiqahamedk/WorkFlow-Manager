import Notification from '../models/Notification.js';
import { sendNotificationEmail } from './emailService.js';

/**
 * Create a notification in DB and send email.
 * @param {object} opts
 * @param {string} opts.user_id
 * @param {string} opts.user_email
 * @param {string} opts.message
 * @param {'success'|'error'|'info'} opts.type
 * @param {string} [opts.execution_id]
 * @param {object} [opts.emailExtra]  — extra data for approval emails (approveUrl, rejectUrl)
 */
export async function createNotification({ user_id, user_email, message, type = 'info', execution_id = null, emailExtra = null }) {
  // 1. Persist to DB
  const notification = await Notification.create({ user_id, user_email, message, type, execution_id });

  // 2. Fire email non-blocking — never delay execution waiting for SMTP
  sendNotificationEmail({ to: user_email, message, type, execution_id, emailExtra })
    .catch((err) => console.error('[Notification] Email send failed:', err.message));

  return notification;
}
