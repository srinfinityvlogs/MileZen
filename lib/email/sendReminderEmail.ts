// Deliberately implemented as a plain fetch() rather than adding the full
// Resend SDK as a dependency — one HTTP call, easy to swap for Postmark/SES
// by changing just this file. Server-side only; RESEND_API_KEY must never
// reach the client bundle.
export async function sendReminderEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — skipping reminder email send.');
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.REMINDER_EMAIL_FROM ?? 'MileZen <reminders@yourdomain.com>',
      to,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    // Log the failure server-side only — never leak provider error details
    // (which could include recipient info) into any user-facing response.
    console.error('Reminder email send failed', { status: res.status });
    return { skipped: false, ok: false };
  }
  return { skipped: false, ok: true };
}
