/* POST /api/desk — the private studio desk's API.
   Every action except login/refresh needs a Supabase session for ADMIN_EMAIL. */
import { handle, json, readBody, clean, isEmail, isId, origin, env, HttpError } from "../lib/http.mjs";
import { db, eq, signIn, refresh, userFor } from "../lib/db.mjs";
import { mailConfig, sendEmail, sendBatch, letterEmail, replyEmail } from "../lib/mail.mjs";

const ENQUIRY_STATUS = ["new", "replied", "done", "spam"];
const SUB_STATUS = ["subscribed", "unsubscribed"];

const adminEmail = () => env("ADMIN_EMAIL").trim().toLowerCase();
const isAdmin = email => !!adminEmail() && String(email || "").toLowerCase() === adminEmail();
const session = s => ({
  access_token: s.access_token,
  refresh_token: s.refresh_token,
  expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
  email: s.user && s.user.email
});

function letterInput(b) {
  const subject = clean(b.subject, 200), body = clean(b.body, 50000);
  if (!subject || !body) throw new HttpError(400, "A letter needs a subject and some words.");
  return { subject, body };
}

function needLive() {
  const m = mailConfig();
  if (!m.live) throw new HttpError(409, "Sending from the desk switches on once your domain is verified in Resend and MAIL_FROM uses it.");
  return m;
}

const unsubLink = (site, token) => `${site}/api/unsubscribe?t=${token}`;

const actions = {
  async overview(b, req, user) {
    const [enquiries, replies, subscribers, letters] = await Promise.all([
      db("enquiries?select=*&order=created_at.desc&limit=1000"),
      db("enquiry_replies?select=*&order=created_at.asc&limit=1000"),
      db("subscribers?select=id,email,status,source,created_at,unsubscribed_at&order=created_at.desc&limit=1000"),
      db("letters?select=*&order=updated_at.desc&limit=200")
    ]);
    const m = mailConfig();
    return { enquiries, replies, subscribers, letters, me: user.email, mail: { ready: m.ready, live: m.live, from: m.from, notify: m.notify } };
  },

  /* ---- enquiries ---- */
  async "enquiry.update"(b) {
    if (!isId(b.id)) throw new HttpError(400, "Which enquiry?");
    const patch = {};
    if (b.status !== undefined) {
      if (!ENQUIRY_STATUS.includes(b.status)) throw new HttpError(400, "Unknown status.");
      patch.status = b.status;
      if (b.status === "replied") patch.replied_at = new Date().toISOString();
    }
    if (b.notes !== undefined) patch.notes = clean(b.notes, 5000) || null;
    const [enquiry] = await db(`enquiries?id=${eq(b.id)}`, { method: "PATCH", body: patch });
    return { enquiry };
  },

  async "enquiry.delete"(b) {
    if (!isId(b.id)) throw new HttpError(400, "Which enquiry?");
    await db(`enquiries?id=${eq(b.id)}`, { method: "DELETE" });
    return {};
  },

  async "enquiry.reply"(b, req) {
    const m = needLive();
    if (!isId(b.id)) throw new HttpError(400, "Which enquiry?");
    const { subject, body } = letterInput(b);
    const [e] = await db(`enquiries?select=*&id=${eq(b.id)}`);
    if (!e) throw new HttpError(404, "That enquiry is gone.");
    const mail = replyEmail({ enquiry: e, subject, body, site: origin(req) });
    await sendEmail({ to: e.email, subject, html: mail.html, text: mail.text, replyTo: m.replyTo });
    const [reply] = await db("enquiry_replies", { method: "POST", body: { enquiry_id: e.id, subject, body } });
    const [enquiry] = await db(`enquiries?id=${eq(e.id)}`, { method: "PATCH", body: { status: "replied", replied_at: new Date().toISOString() } });
    return { reply, enquiry };
  },

  /* ---- subscribers ---- */
  async "subscriber.add"(b) {
    const email = clean(b.email, 254).toLowerCase();
    if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
    const [existing] = await db(`subscribers?select=id&email=${eq(email)}`);
    const [subscriber] = existing
      ? await db(`subscribers?id=${eq(existing.id)}`, { method: "PATCH", body: { status: "subscribed", unsubscribed_at: null } })
      : await db("subscribers", { method: "POST", body: { email, source: "desk" } });
    delete subscriber.token;
    return { subscriber };
  },

  async "subscriber.update"(b) {
    if (!isId(b.id) || !SUB_STATUS.includes(b.status)) throw new HttpError(400, "Which subscriber, and which status?");
    const body = { status: b.status, unsubscribed_at: b.status === "unsubscribed" ? new Date().toISOString() : null };
    const [subscriber] = await db(`subscribers?id=${eq(b.id)}`, { method: "PATCH", body });
    delete subscriber.token;
    return { subscriber };
  },

  async "subscriber.delete"(b) {
    if (!isId(b.id)) throw new HttpError(400, "Which subscriber?");
    await db(`subscribers?id=${eq(b.id)}`, { method: "DELETE" });
    return {};
  },

  /* ---- letters (the newsletter) ---- */
  // The finished email (HTML + plain text). Used for the preview and for "Copy letter" when sending from Gmail.
  async "letter.preview"(b, req) {
    const { subject, body } = letterInput(b);
    const site = origin(req);
    const mail = letterEmail({ subject, body, site, unsubUrl: `${site}/unsubscribe` });
    return { html: mail.html, text: mail.text };
  },

  /* Letters live in the `letters` table: drafts while you write, "sent" once they go out. */
  async "letter.save"(b) {
    const { subject, body } = letterInput(b);
    const now = new Date().toISOString();
    if (b.id !== undefined && b.id !== null) {
      if (!isId(b.id)) throw new HttpError(400, "Which letter?");
      const [letter] = await db(`letters?id=${eq(b.id)}&status=eq.draft`, { method: "PATCH", body: { subject, body, updated_at: now } });
      if (letter) return { letter };
    }
    const [letter] = await db("letters", { method: "POST", body: { subject, body, status: "draft", updated_at: now } });
    return { letter };
  },

  // After sending it yourself (e.g. from Gmail): file the letter under Sent with today's list size.
  async "letter.mark_sent"(b) {
    if (!isId(b.id)) throw new HttpError(400, "Save the letter first.");
    const subs = await db("subscribers?select=id&status=eq.subscribed&limit=1000");
    const now = new Date().toISOString();
    const [letter] = await db(`letters?id=${eq(b.id)}`, { method: "PATCH", body: { status: "sent", sent_at: now, updated_at: now, sent_to: subs.length } });
    if (!letter) throw new HttpError(404, "That letter is gone.");
    return { letter };
  },

  async "letter.delete"(b) {
    if (!isId(b.id)) throw new HttpError(400, "Which letter?");
    await db(`letters?id=${eq(b.id)}`, { method: "DELETE" });
    return {};
  },

  async "letter.test"(b, req) {
    const m = mailConfig();
    if (!m.ready || !m.notify) throw new HttpError(503, "Set RESEND_API_KEY and NOTIFY_EMAIL in Netlify to send tests.");
    const { subject, body } = letterInput(b);
    const site = origin(req);
    const mail = letterEmail({ subject, body, site, unsubUrl: `${site}/unsubscribe` });
    await sendEmail({ to: m.notify, subject: `[Test] ${subject}`, html: mail.html, text: mail.text });
    return { to: m.notify };
  },

  async "letter.send"(b, req) {
    const m = needLive();
    const { subject, body } = letterInput(b);
    const subs = await db("subscribers?select=email,token&status=eq.subscribed&limit=1000");
    if (!subs.length) throw new HttpError(409, "Nobody is subscribed yet.");
    if (Number(b.expect) !== subs.length) throw new HttpError(409, `The list changed while you were writing: it's ${subs.length} people now. Check and send again.`);

    // Guard against a double send of the same letter.
    const since = new Date(Date.now() - 15 * 60e3).toISOString();
    const [dupe] = await db(`letters?select=id&status=eq.sent&subject=${eq(subject)}&sent_at=gte.${encodeURIComponent(since)}`);
    if (dupe) throw new HttpError(409, "A letter with this subject went out in the last 15 minutes.");

    const site = origin(req);
    const msgs = subs.map(s => {
      const unsubUrl = unsubLink(site, s.token);
      const mail = letterEmail({ subject, body, site, unsubUrl });
      return {
        to: s.email, subject, html: mail.html, text: mail.text, replyTo: m.replyTo,
        headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      };
    });

    let sent = 0, failure = null;
    try { sent = await sendBatch(msgs); }
    catch (e) { sent = e.sent || 0; failure = e; }
    const now = new Date().toISOString(), row = { subject, body, sent_to: sent, status: failure ? "partial" : "sent", sent_at: now, updated_at: now };
    const [letter] = isId(b.id)
      ? await db(`letters?id=${eq(b.id)}`, { method: "PATCH", body: row })
      : await db("letters", { method: "POST", body: row });
    if (failure) throw new HttpError(502, `Sent to ${sent} of ${msgs.length}, then the email service stopped: ${failure.message}`);
    return { letter };
  }
};

export default handle(async req => {
  if (req.method !== "POST") throw new HttpError(405, "POST only.");
  const b = await readBody(req);
  const action = String(b.action || "");

  if (action === "login") {
    const email = clean(b.email, 254).toLowerCase(), password = String(b.password || "");
    if (!adminEmail()) throw new HttpError(503, "ADMIN_EMAIL isn't set in Netlify yet.");
    if (!isAdmin(email) || !password) throw new HttpError(401, "That email and password don't match.");
    return json({ ok: true, session: session(await signIn(email, password)) });
  }
  // Tells the desk whether the backend is set up (if not, it offers its demo mode). Reveals nothing else.
  if (action === "status") {
    return json({ ok: true, ready: !!(env("SUPABASE_URL") && env("SUPABASE_SERVICE_KEY") && adminEmail()) });
  }
  if (action === "refresh") {
    const s = await refresh(String(b.refresh_token || ""));
    if (!isAdmin(s.user && s.user.email)) throw new HttpError(403, "This account can't open the desk.");
    return json({ ok: true, session: session(s) });
  }

  const fn = Object.hasOwn(actions, action) && actions[action];
  if (!fn) throw new HttpError(400, "Unknown action.");
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Sign in first.");
  const user = await userFor(token);
  if (!isAdmin(user.email)) throw new HttpError(403, "This account can't open the desk.");
  return json({ ok: true, ...(await fn(b, req, user)) });
});

export const config = { path: "/api/desk" };
