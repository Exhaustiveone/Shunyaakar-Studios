/* Email through Resend (resend.com) over its REST API, plus the email
   templates. Flat Rajasthan palette: ink, paper, one solid colour block. */
import { env, esc, HttpError } from "./http.mjs";

const RESEND = "https://api.resend.com";

/* "live" means a verified domain is in MAIL_FROM. Until then Resend only
   delivers to the address that owns the Resend account, so we only send
   the owner's own alerts and tests. */
export function mailConfig() {
  const key = env("RESEND_API_KEY");
  const from = env("MAIL_FROM") || "Shunyaakar <onboarding@resend.dev>";
  const notify = env("NOTIFY_EMAIL");
  return {
    ready: !!key,
    live: !!key && !/@resend\.dev>?\s*$/i.test(from),
    from, notify,
    replyTo: env("REPLY_TO") || notify
  };
}

async function resend(path, payload) {
  const key = env("RESEND_API_KEY");
  if (!key) throw new HttpError(503, "Email isn't connected yet (RESEND_API_KEY).");
  const res = await fetch(`${RESEND}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend", res.status, data);
    throw new HttpError(502, `The email service said: ${data.message || res.status}`);
  }
  return data;
}

const message = ({ to, subject, html, text, replyTo, headers }) => {
  const m = { from: mailConfig().from, to: [].concat(to), subject, html, text };
  if (replyTo) m.reply_to = replyTo;
  if (headers) m.headers = headers;
  return m;
};

export const sendEmail = msg => resend("/emails", message(msg));

// Resend takes up to 100 emails per batch call; pause between calls to stay under its rate limit.
export async function sendBatch(msgs) {
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 100) {
    if (i) await new Promise(r => setTimeout(r, 600));
    try { await resend("/emails/batch", msgs.slice(i, i + 100).map(message)); }
    catch (e) { e.sent = sent; throw e; }
    sent += Math.min(100, msgs.length - i);
  }
  return sent;
}

/* ------------------------------------------------------------------
   Writing format for letters and replies (kept deliberately small):
     blank line          new paragraph
     # Heading           a heading line
     **words**           bold
     [text](https://…)   a link
     ![caption](https://…/still.jpg)   an image
   ------------------------------------------------------------------ */
const FONT = `'Bricolage Grotesque',Helvetica,Arial,sans-serif`;
const DISPLAY = `Unbounded,'Arial Black',Arial,sans-serif`;
const URL_RE = `(https?:\\/\\/[^\\s)]+|mailto:[^\\s)]+)`;

function inline(s) {
  return esc(s)
    .replace(new RegExp(`!\\[([^\\]]*)\\]\\(${URL_RE}\\)`, "g"), (m, alt, u) =>
      `<img src="${u}" alt="${alt}" width="536" style="display:block;width:100%;max-width:536px;height:auto;margin:8px 0;border:0">`)
    .replace(new RegExp(`\\[([^\\]]+)\\]\\(${URL_RE}\\)`, "g"), (m, t, u) =>
      `<a href="${u}" style="color:#0E0A1C;text-decoration:underline;text-underline-offset:3px">${t}</a>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function formatHTML(src) {
  return String(src || "").replace(/\r\n?/g, "\n").trim().split(/\n{2,}/).map(block => {
    const h = !block.includes("\n") && block.match(/^#{1,3}\s+(.+)$/);
    if (h) return `<h2 style="margin:28px 0 10px;font:700 20px/1.3 ${DISPLAY};color:#0E0A1C">${inline(h[1])}</h2>`;
    return `<p style="margin:0 0 16px">${inline(block).replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

export function formatText(src) {
  return String(src || "").replace(/\r\n?/g, "\n").trim()
    .replace(new RegExp(`!\\[([^\\]]*)\\]\\(${URL_RE}\\)`, "g"), (m, alt, u) => `[${alt || "image"}] ${u}`)
    .replace(new RegExp(`\\[([^\\]]+)\\]\\(${URL_RE}\\)`, "g"), "$1 ($2)")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,3}\s+/gm, "");
}

/* The shared email shell: wordmark, a four-block spectrum bar, a paper sheet. */
function shell({ subject, preheader = "", kicker, tone = "#FFB224", title, body, foot }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700&family=Unbounded:wght@700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0E0A1C">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0E0A1C" style="background:#0E0A1C">
<tr><td align="center" style="padding:28px 12px 36px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
    <tr><td style="padding:0 4px 16px;font:800 18px/1 ${DISPLAY};letter-spacing:.14em;color:#F6F0E6">SHUNYAAKAR</td></tr>
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="6" bgcolor="#FF3D8B" style="font-size:0;line-height:0">&nbsp;</td><td height="6" bgcolor="#FFB224" style="font-size:0;line-height:0">&nbsp;</td>
        <td height="6" bgcolor="#13C2B0" style="font-size:0;line-height:0">&nbsp;</td><td height="6" bgcolor="#4B63FF" style="font-size:0;line-height:0">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="#F3EDE1" style="background:#F3EDE1;padding:34px 32px 30px;color:#0E0A1C;font:16px/1.65 ${FONT}">
      ${kicker ? `<p style="margin:0 0 18px"><span style="display:inline-block;background:${tone};color:#0E0A1C;padding:5px 9px;font:700 11px/1 ${DISPLAY};letter-spacing:.12em;text-transform:uppercase">${esc(kicker)}</span></p>` : ""}
      ${title ? `<h1 style="margin:0 0 20px;font:800 26px/1.2 ${DISPLAY};color:#0E0A1C">${esc(title)}</h1>` : ""}
      ${body}
    </td></tr>
    <tr><td style="padding:22px 4px 0;color:#A59DBF;font:13px/1.6 ${FONT}">
      <p style="margin:0 0 6px;color:#F6F0E6;font-size:15px" lang="hi">शून्य से, सब कुछ।</p>
      ${foot || ""}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const lightLink = (href, text) => `<a href="${esc(href)}" style="color:#F6F0E6;text-decoration:underline">${esc(text)}</a>`;

export function letterEmail({ subject, body, unsubUrl, site }) {
  const foot = `Shunyaakar, Jaipur. You're getting this because you signed up for Letters from the set at ${lightLink(site, site.replace(/^https?:\/\//, ""))}.<br>${lightLink(unsubUrl, "Unsubscribe")} any time.`;
  return {
    html: shell({ subject, preheader: formatText(body).slice(0, 110), kicker: "Letters from the set", tone: "#FFB224", title: subject, body: formatHTML(body), foot }),
    text: `${subject}\n\n${formatText(body)}\n\n--\nShunyaakar, Jaipur\nUnsubscribe: ${unsubUrl}`
  };
}

export function welcomeEmail({ unsubUrl, site }) {
  const subject = "You're on the list";
  const body = `Thank you for signing up. Letters from the set are drafts, stills, songs and the odd disaster, straight from the making of AHAM. Not too often.\n\nThe first one comes from the set.\n\nMayank`;
  return { subject, ...letterEmail({ subject, body, unsubUrl, site }) };
}

const row = (k, v) => v ? `<tr><td style="padding:4px 14px 4px 0;vertical-align:top;color:#5B5470;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0;vertical-align:top">${esc(v)}</td></tr>` : "";

export function enquiryAlert(e, site) {
  const subject = `New enquiry: ${e.project || "Something else"}, from ${e.name}`;
  const body = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;font:15px/1.5 ${FONT}">
      ${row("From", `${e.name} <${e.email}>`)}${row("Making", e.project)}${row("When", e.timeline)}
    </table>
    <div style="border-left:4px solid #FF3D8B;padding:2px 0 2px 16px;margin:0 0 24px;white-space:pre-wrap">${esc(e.message)}</div>
    <p style="margin:0"><a href="${esc(site)}/desk/#e-${e.id}" style="display:inline-block;background:#0E0A1C;color:#F6F0E6;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Open in the desk</a></p>
    <p style="margin:14px 0 0;color:#5B5470;font-size:14px">Or just hit reply: it goes straight to ${esc(e.name)}.</p>`;
  return {
    subject,
    html: shell({ subject, preheader: e.message.slice(0, 110), kicker: "New enquiry", tone: "#FF3D8B", title: e.name, body }),
    text: `${subject}\n\nFrom: ${e.name} <${e.email}>\nMaking: ${e.project || "-"}\nWhen: ${e.timeline || "-"}\n\n${e.message}\n\nOpen in the desk: ${site}/desk/#e-${e.id}`
  };
}

export function enquiryAck(e, site, replyTime = "within two days") {
  const subject = "Got your message";
  const body = formatHTML(`Hi ${e.name.split(/\s+/)[0]},\n\nThank you for writing to Shunyaakar. Your message is on my desk, and I'll reply ${replyTime}.\n\nMayank`) +
    `<div style="border-left:4px solid #FFB224;padding:2px 0 2px 16px;margin:8px 0 0;color:#5B5470;white-space:pre-wrap;font-size:14px">${esc(e.message)}</div>`;
  return {
    subject,
    html: shell({ subject, preheader: "Your message is on my desk.", kicker: "Shunyaakar", tone: "#FFB224", body, foot: `Shunyaakar, Jaipur. ${lightLink(site, site.replace(/^https?:\/\//, ""))}` }),
    text: `Hi ${e.name.split(/\s+/)[0]},\n\nThank you for writing to Shunyaakar. Your message is on my desk, and I'll reply ${replyTime}.\n\nMayank\n\n> ${e.message.replace(/\n/g, "\n> ")}`
  };
}

export function replyEmail({ enquiry: e, subject, body, site }) {
  const quote = `<div style="border-left:4px solid #D8D0C0;padding:2px 0 2px 16px;margin:24px 0 0;color:#5B5470;font-size:14px">
      <p style="margin:0 0 6px;font-weight:700">${esc(e.name)} wrote:</p><div style="white-space:pre-wrap">${esc(e.message)}</div></div>`;
  return {
    html: shell({ subject, preheader: formatText(body).slice(0, 110), body: formatHTML(body) + quote, foot: `Shunyaakar, Jaipur. ${lightLink(site, site.replace(/^https?:\/\//, ""))}` }),
    text: `${formatText(body)}\n\n> ${e.name} wrote:\n> ${e.message.replace(/\n/g, "\n> ")}`
  };
}
