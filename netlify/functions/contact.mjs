/* POST /api/contact — the "Work with us" form. Saves the enquiry and
   emails the owner an alert (reply goes straight to the sender). */
import { handle, json, page, readBody, clean, isEmail, wantsJSON, origin, HttpError } from "../lib/http.mjs";
import { db, eq } from "../lib/db.mjs";
import { mailConfig, sendEmail, enquiryAlert, enquiryAck } from "../lib/mail.mjs";

const received = req => wantsJSON(req)
  ? json({ ok: true })
  : page("Received", `<p>Thank you. Your message is on my desk, and I'll reply within two days.</p><p><a href="/">Back to the site</a></p>`);

export default handle(async req => {
  if (req.method !== "POST") throw new HttpError(405, "Use the form on the site.");
  const b = await readBody(req);
  if (clean(b.company, 200)) return received(req); // honeypot filled: a bot. Pretend it worked.

  const e = {
    name: clean(b.name, 120),
    email: clean(b.email, 254).toLowerCase(),
    project: clean(b.project, 120) || null,
    timeline: clean(b.timeline, 200) || null,
    message: clean(b.message, 5000)
  };
  if (!e.name || !isEmail(e.email) || !e.message) throw new HttpError(400, "Please add your name, a valid email and a message.");

  // Flood guard: at most three messages from one address in ten minutes.
  const since = new Date(Date.now() - 10 * 60e3).toISOString();
  const recent = await db(`enquiries?select=id&email=${eq(e.email)}&created_at=gte.${encodeURIComponent(since)}`);
  if (recent.length >= 3) throw new HttpError(429, "That's a few messages at once. Give it ten minutes and try again.");

  const [saved] = await db("enquiries", { method: "POST", body: e });

  // Emails are a bonus: the enquiry is already safe in the database, so a mail hiccup must not fail the form.
  const mail = mailConfig(), site = origin(req), jobs = [];
  if (mail.ready && mail.notify) {
    const a = enquiryAlert(saved, site);
    jobs.push(sendEmail({ to: mail.notify, subject: a.subject, html: a.html, text: a.text, replyTo: saved.email }));
  }
  if (mail.live) {
    const k = enquiryAck(saved, site);
    jobs.push(sendEmail({ to: saved.email, subject: k.subject, html: k.html, text: k.text, replyTo: mail.replyTo }));
  }
  (await Promise.allSettled(jobs)).forEach(r => r.status === "rejected" && console.error("contact mail", r.reason));

  return received(req);
});

export const config = { path: "/api/contact" };
