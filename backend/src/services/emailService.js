import nodemailer from 'nodemailer';

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If no SMTP credentials configured → use Ethereal (free catch-all for dev/testing)
  if (!user || !pass) {
    console.warn('[Email] No SMTP credentials found — using Ethereal test account.');
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[Email] Ethereal account: ${testAccount.user} / ${testAccount.pass}`);
    return _transporter;
  }

  // Real SMTP — Gmail, SendGrid, etc.
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    // Keep connection pool open — avoids re-handshake on every send
    pool: true,
    maxConnections: 3,
  });

  // Skip verify() — it adds 2-5s latency on every cold start.
  // Errors will surface naturally on sendMail().
  console.log('[Email] SMTP transporter created');
  return _transporter;
}

export async function sendApprovalEmail({ to, workflowName, stepName, inputData, executionId, token, baseUrl }) {
  const approveUrl = `${baseUrl}/approve?executionId=${executionId}&action=approve&token=${token}`;
  const rejectUrl  = `${baseUrl}/approve?executionId=${executionId}&action=reject&token=${token}`;

  const dataRows = Object.entries(inputData || {})
    .map(([k, v]) => `
      <tr>
        <td style="padding:6px 12px;color:#94a3b8;font-size:13px;border-bottom:1px solid #1e293b;">${k}</td>
        <td style="padding:6px 12px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #1e293b;">${String(v)}</td>
      </tr>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

    <div style="background:linear-gradient(135deg,#7c3aed 0%,#0891b2 100%);padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td>
          <div style="display:inline-block;width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;line-height:32px;font-weight:bold;color:#fff;font-size:14px;vertical-align:middle;">W</div>
          <span style="color:#fff;font-weight:600;font-size:15px;vertical-align:middle;margin-left:10px;">WorkFlow Manager</span>
        </td>
        <td style="text-align:right;color:rgba(255,255,255,0.6);font-size:12px;">Approval Request</td>
      </tr></table>
    </div>

    <div style="padding:28px 32px;">
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 8px;">&#9995; Action Required</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
        You have been assigned as approver for a workflow step. Please review the details below and take action.
      </p>

      <div style="background:#0f172a;border-radius:10px;overflow:hidden;margin-bottom:20px;border:1px solid #334155;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#1e293b;">
            <td style="padding:8px 12px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Workflow</td>
            <td style="padding:8px 12px;color:#e2e8f0;font-size:13px;font-weight:600;">${workflowName}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #1e293b;">Step</td>
            <td style="padding:8px 12px;color:#e2e8f0;font-size:13px;border-top:1px solid #1e293b;">${stepName}</td>
          </tr>
          ${dataRows}
        </table>
      </div>

      <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;">Full Input Data</p>
      <pre style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:14px;color:#7dd3fc;font-size:12px;overflow:auto;margin:0 0 20px;white-space:pre-wrap;word-break:break-all;">${JSON.stringify(inputData, null, 2)}</pre>

      <div style="background:#f59e0b1a;border:1px solid #f59e0b33;border-radius:8px;padding:10px 14px;margin-bottom:24px;">
        <p style="color:#fbbf24;font-size:12px;margin:0;">&#9201; These links expire in <strong>10 minutes</strong> from when this email was sent.</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${approveUrl}" style="display:block;text-align:center;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700;font-size:15px;">
              &#10003; Accept Task
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${rejectUrl}" style="display:block;text-align:center;background:#dc2626;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:700;font-size:15px;">
              &#10007; Decline Task
            </a>
          </td>
        </tr>
      </table>
    </div>

    <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">This email was sent by WorkFlow Manager. Do not share these links with anyone.</p>
    </div>
  </div>
</body>
</html>`;

  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"WorkFlow Manager" <${process.env.SMTP_USER}>`,
    to,
    subject: `[Action Required] Approval: ${stepName} — ${workflowName}`,
    html,
  });

  // If using Ethereal, log the preview URL so you can see the email in browser
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] Preview URL (Ethereal): ${previewUrl}`);
  }

  return info;
}

const TYPE_STYLES = {
  success: { color: '#4ade80', icon: '✓', label: 'Success' },
  error:   { color: '#f87171', icon: '✕', label: 'Failed' },
  info:    { color: '#60a5fa', icon: 'ℹ', label: 'Info' },
};

export async function sendNotificationEmail({ to, message, type = 'info', execution_id, emailExtra }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;
  const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
  const viewUrl = execution_id ? `${frontendUrl}/executions/${execution_id}` : null;

  // Build action buttons — approval extras take priority
  let actionHtml = '';
  if (emailExtra?.approveUrl && emailExtra?.rejectUrl) {
    actionHtml = `
      <table style="width:100%;border-collapse:collapse;margin-top:20px;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${emailExtra.approveUrl}" style="display:block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">&#10003; Accept Task</a>
          </td>
          <td style="padding-left:8px;">
            <a href="${emailExtra.rejectUrl}" style="display:block;text-align:center;background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">&#10007; Decline Task</a>
          </td>
        </tr>
      </table>`;
  } else if (viewUrl) {
    actionHtml = `
      <div style="margin-top:20px;text-align:center;">
        <a href="${viewUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:14px;">View Execution →</a>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#0891b2 100%);padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td>
          <div style="display:inline-block;width:28px;height:28px;background:rgba(255,255,255,0.2);border-radius:7px;text-align:center;line-height:28px;font-weight:bold;color:#fff;font-size:13px;vertical-align:middle;">W</div>
          <span style="color:#fff;font-weight:600;font-size:14px;vertical-align:middle;margin-left:8px;">WorkFlow Manager</span>
        </td>
        <td style="text-align:right;color:rgba(255,255,255,0.6);font-size:11px;">Notification</td>
      </tr></table>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:22px;color:${style.color};">${style.icon}</span>
        <span style="color:${style.color};font-weight:700;font-size:16px;">${style.label}</span>
      </div>
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 8px;line-height:1.6;">${message}</p>
      ${execution_id ? `<p style="color:#64748b;font-size:12px;font-mono;margin:0;">Execution: ${execution_id}</p>` : ''}
      ${actionHtml}
    </div>
    <div style="padding:14px 32px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">WorkFlow Manager — automated notification</p>
    </div>
  </div>
</body>
</html>`;

  const transporter = await getTransporter();
  const subjectMap = { success: '✓', error: '✕', info: 'ℹ' };
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"WorkFlow Manager" <${process.env.SMTP_USER}>`,
    to,
    subject: `${subjectMap[type] || 'ℹ'} ${message}`,
    html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[Email] Notification preview: ${previewUrl}`);
  return info;
}
