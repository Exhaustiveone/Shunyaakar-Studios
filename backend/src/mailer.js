// Outgoing email (desk replies) over SMTP with Nodemailer. Credentials come only from the
// environment; the transport is created on first use and reused.
import nodemailer from "nodemailer";
import { config } from "./config.js";
import { HttpError, esc } from "./http.js";

export const mailEnabled = () => !!(config.smtpHost && config.smtpUser && config.smtpPass);
export const mailFrom = () => config.mailFrom || config.smtpUser;

let transport = null;
function getTransport() {
  transport ??= nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,       // 465: TLS from the start; 587/2525: upgraded with STARTTLS
    requireTLS: config.smtpPort !== 465,   // never send credentials or mail in the clear
    auth: { user: config.smtpUser, pass: config.smtpPass },
    tls: { minVersion: "TLSv1.2" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });
  return transport;
}

// Plain-text body → simple, safe HTML (everything escaped; blank lines become paragraphs).
function toHtml(text, quote) {
  const paras = text.split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const q = quote ? `<div style="margin-top:22px;padding-left:14px;border-left:3px solid #d8d0c0;color:#5b5470">
      <p style="margin:0 0 6px;font-weight:600">${esc(quote.name)} wrote:</p>${esc(quote.message).replace(/\n/g, "<br>")}</div>` : "";
  return `<div style="font:15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0e0a1c;max-width:620px">${paras}${q}</div>`;
}

export async function sendMail({ to, subject, text, quote }) {
  if (!mailEnabled()) throw new HttpError(503, "Email sending isn't set up yet (SMTP_HOST, SMTP_USER and SMTP_PASS on the server).");
  const quoted = quote ? `\n\n> ${quote.name} wrote:\n> ${quote.message.replace(/\n/g, "\n> ")}` : "";
  try {
    const info = await getTransport().sendMail({
      from: mailFrom(),
      to,
      replyTo: config.mailReplyTo || undefined,
      subject,
      text: text + quoted,
      html: toHtml(text, quote)
    });
    return info.messageId || null;
  } catch (err) {
    console.error("mail: send failed:", err.code || "", err.responseCode || "", err.message);
    if (err.code === "EAUTH") throw new HttpError(502, "The email server rejected the login. Check SMTP_USER and SMTP_PASS (for Gmail, use an App Password).");
    if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNREFUSED", "EDNS"].includes(err.code)) {
      throw new HttpError(502, "Couldn't reach the email server. On Render's free plan, outgoing SMTP (ports 25, 465, 587) is blocked; a paid instance or a provider on port 2525 is needed.");
    }
    if (err.responseCode >= 500) throw new HttpError(502, "The email server refused the message. Check the recipient address and try again.");
    throw new HttpError(502, "The email couldn't be sent. Please try again.");
  }
}
