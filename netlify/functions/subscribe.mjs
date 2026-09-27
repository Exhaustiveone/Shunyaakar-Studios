/* POST /api/subscribe — "Letters from the set" sign-up. */
import { handle, json, page, readBody, clean, isEmail, wantsJSON, origin, HttpError } from "../lib/http.mjs";
import { db, eq } from "../lib/db.mjs";
import { mailConfig, sendEmail, welcomeEmail } from "../lib/mail.mjs";

const done = req => wantsJSON(req)
  ? json({ ok: true })
  : page("You're on the list", `<p>The first letter comes from the set.</p><p><a href="/">Back to the site</a></p>`);

export default handle(async req => {
  if (req.method !== "POST") throw new HttpError(405, "Use the form on the site.");
  const b = await readBody(req);
  if (clean(b.website, 200)) return done(req); // honeypot

  const email = clean(b.email, 254).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");

  const [existing] = await db(`subscribers?select=*&email=${eq(email)}`);
  let sub;
  if (existing && existing.status === "subscribed") return done(req); // already in: say nothing more
  if (existing) {
    [sub] = await db(`subscribers?id=${eq(existing.id)}`, { method: "PATCH", body: { status: "subscribed", unsubscribed_at: null } });
  } else {
    try {
      [sub] = await db("subscribers", { method: "POST", body: { email, source: clean(b.source, 60) || "footer" } });
    } catch (e) {
      if (e.status === 409) return done(req); // a double click raced us
      throw e;
    }
  }

  const mail = mailConfig();
  if (mail.live && sub) {
    const site = origin(req);
    const w = welcomeEmail({ site, unsubUrl: `${site}/api/unsubscribe?t=${sub.token}` });
    await sendEmail({ to: email, subject: w.subject, html: w.html, text: w.text, replyTo: mail.replyTo }).catch(e => console.error("welcome mail", e));
  }
  return done(req);
});

export const config = { path: "/api/subscribe" };
