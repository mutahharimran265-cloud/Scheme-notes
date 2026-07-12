// Transactional email over SMTP (nodemailer). Works with any SMTP provider —
// Gmail app password, Resend, SendGrid, Postmark, Mailgun, self-hosted, etc.
// If SMTP isn't configured the caller falls back to logging the link (dev), so
// the app still runs with zero email setup.

import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null | undefined;

function transporter(): Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.SMTP_HOST;
  if (!host) {
    cached = null;
    return null;
  }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    // true for implicit TLS on 465; false uses STARTTLS on 587.
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return cached;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

const FROM = () => process.env.SMTP_FROM || "SchemNotes <no-reply@localhost>";

/** Notifies someone they were @mentioned in a comment. Throws if SMTP is off. */
export async function sendMentionNotification(
  to: string,
  opts: { projectTitle: string; author: string; link: string; snippet: string },
): Promise<void> {
  const t = transporter();
  if (!t) throw new Error("SMTP is not configured (set SMTP_HOST).");
  await t.sendMail({
    from: FROM(),
    to,
    subject: `${opts.author} mentioned you in "${opts.projectTitle}"`,
    text: `${opts.author} mentioned you in a schematic review:\n\n"${opts.snippet}"\n\nView it: ${opts.link}\n`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0e1424">
        <h2 style="font-size:18px;margin:0 0 8px">${opts.author} mentioned you</h2>
        <p style="margin:0 0 4px;color:#475">in the schematic review <strong>${opts.projectTitle}</strong>:</p>
        <blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #4f46e5;color:#334">${opts.snippet}</blockquote>
        <a href="${opts.link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">View the comment</a>
      </div>`,
  });
}

/** Sends the passwordless sign-in link. Throws if SMTP isn't configured. */
export async function sendMagicLink(to: string, link: string): Promise<void> {
  const t = transporter();
  if (!t) throw new Error("SMTP is not configured (set SMTP_HOST).");
  await t.sendMail({
    from: FROM(),
    to,
    subject: "Your SchemNotes sign-in link",
    text:
      `Sign in to SchemNotes:\n\n${link}\n\n` +
      `This link expires in 15 minutes. If you didn't request it, ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0e1424">
        <h2 style="font-size:18px;margin:0 0 12px">Sign in to SchemNotes</h2>
        <p style="margin:0 0 20px;color:#475">Click the button below to sign in. This link expires in 15 minutes.</p>
        <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Sign in</a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a">If you didn't request this, you can safely ignore this email.</p>
      </div>`,
  });
}
