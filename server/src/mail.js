import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP is not configured (see server/.env.example) — password reset emails will fail to send.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true", // true for port 465, false for 587/25 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function styledEmail({ heading, body, cta, url }) {
  return `
    <div style="font-family: sans-serif; color: #171634; max-width: 480px; margin: 0 auto;">
      <p style="text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; font-weight: 600; color: #C42B6B;">Day Book</p>
      <h2 style="margin: 8px 0 16px;">${heading}</h2>
      <p>${body}</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background:#171634;color:#ECEEE8;padding:10px 20px;text-decoration:none;display:inline-block;">${cta}</a>
      </p>
      <p style="color:#4A4870;font-size:13px;">If you didn't expect this email, you can safely ignore it.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter();
  if (!t) throw new Error("Email is not configured on the server");

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Day Book password",
    text: `We got a request to reset your Day Book password.\n\nReset it here (valid for 30 minutes): ${resetUrl}\n\nIf you didn't ask for this, you can ignore this email — your password won't change.`,
    html: styledEmail({
      heading: "Reset your password",
      body: "We got a request to reset the password on your account. This link is valid for 30 minutes.",
      cta: "Reset password",
      url: resetUrl,
    }),
  });
}

export async function sendWelcomeEmail(to, name, setupUrl) {
  const t = getTransporter();
  if (!t) throw new Error("Email is not configured on the server");

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "You've been added to Day Book",
    text: `Hi ${name},\n\nAn account has been created for you on Day Book. Set your password here (valid for 30 minutes): ${setupUrl}`,
    html: styledEmail({
      heading: `Welcome, ${name}`,
      body: "An account has been created for you on Day Book. Set a password to get started — this link is valid for 30 minutes.",
      cta: "Set your password",
      url: setupUrl,
    }),
  });
}
