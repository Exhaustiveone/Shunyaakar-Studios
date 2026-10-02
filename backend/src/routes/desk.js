// The desk's data. Every handler starts with requireAdmin (session + role, checked in the database).
import { query, one } from "../db.js";
import { HttpError, sendJson, readBody, clean, isUuid } from "../http.js";
import { requireAdmin } from "./auth.js";
import { sendMail, mailEnabled, mailFrom } from "../mailer.js";
import { rateLimiter } from "../security.js";

const replyLimit = rateLimiter({ windowMs: 60 * 60_000, max: 40 }); // per admin, per hour

const STATUSES = ["new", "replied", "done", "spam"];
const LIMIT = 2000;

// GET /api/desk/overview — everything the desk shows, in one round trip
export async function overview(req, res) {
  const s = await requireAdmin(req);
  const [enquiries, subscribers, replies] = await Promise.all([
    query(
      `select id, created_at, name, email, project, timeline, message, status, notes, replied_at
         from enquiries order by created_at desc limit $1`, [LIMIT]),
    query("select id, created_at, email from newsletter_subscribers order by created_at desc limit $1", [LIMIT]),
    query("select id, created_at, enquiry_id, subject, body, sent_to from enquiry_replies order by created_at asc limit $1", [LIMIT])
  ]);
  sendJson(res, 200, {
    ok: true, me: s.user.email, enquiries: enquiries.rows, subscribers: subscribers.rows, replies: replies.rows,
    mail: { enabled: mailEnabled(), from: mailEnabled() ? mailFrom() : null }
  });
}

// PATCH /api/desk/enquiries/:id  { status?, notes? }
export async function updateEnquiry(req, res, { id }) {
  await requireAdmin(req);
  if (!isUuid(id)) throw new HttpError(400, "Which enquiry?");
  const b = await readBody(req);
  const status = b.status === undefined ? null : b.status;
  if (status !== null && !STATUSES.includes(status)) throw new HttpError(400, "Unknown status.");
  const notesGiven = b.notes !== undefined;
  const notes = notesGiven ? clean(b.notes, 5000, { multiline: true }) || null : null;
  if (status === null && !notesGiven) throw new HttpError(400, "Nothing to change.");

  const row = await one(
    `update enquiries set
       status     = coalesce($2, status),
       replied_at = case when $2 = 'replied' then now() else replied_at end,
       notes      = case when $3 then $4 else notes end
     where id = $1
     returning id, created_at, name, email, project, timeline, message, status, notes, replied_at`,
    [id, status, notesGiven, notes]
  );
  if (!row) throw new HttpError(404, "That enquiry is gone.");
  sendJson(res, 200, { ok: true, enquiry: row });
}

// DELETE /api/desk/enquiries/:id
export async function deleteEnquiry(req, res, { id }) {
  await requireAdmin(req);
  if (!isUuid(id)) throw new HttpError(400, "Which enquiry?");
  await query("delete from enquiries where id = $1", [id]);
  sendJson(res, 200, { ok: true });
}

// DELETE /api/desk/subscribers/:id — for when someone asks to be removed
export async function deleteSubscriber(req, res, { id }) {
  await requireAdmin(req);
  if (!isUuid(id)) throw new HttpError(400, "Which sign-up?");
  await query("delete from newsletter_subscribers where id = $1", [id]);
  sendJson(res, 200, { ok: true });
}

// POST /api/desk/enquiries/:id/reply  { subject, body }
// Emails the enquirer straight from the studio's address (SMTP). The recipient is always the
// enquiry's own email, read from the database, so the desk can't be used to mail anyone else.
export async function replyEnquiry(req, res, { id }) {
  const s = await requireAdmin(req);
  if (!isUuid(id)) throw new HttpError(400, "Which enquiry?");
  const wait = replyLimit(s.user.id);
  if (wait) throw new HttpError(429, "That's a lot of emails in an hour. Try again a little later.", { "Retry-After": String(wait) });

  const b = await readBody(req);
  const subject = clean(b.subject, 200);
  const body = clean(b.body, 10000, { multiline: true });
  if (!subject || !body) throw new HttpError(400, "Add a subject and a message.");

  const e = await one("select id, name, email, message from enquiries where id = $1", [id]);
  if (!e) throw new HttpError(404, "That enquiry is gone.");

  const messageId = await sendMail({ to: e.email, subject, text: body, quote: { name: e.name, message: e.message } });

  const reply = await one(
    `insert into enquiry_replies (enquiry_id, subject, body, sent_to, message_id) values ($1, $2, $3, $4, $5)
     returning id, created_at, enquiry_id, subject, body, sent_to`,
    [e.id, subject, body, e.email, messageId]
  );
  const enquiry = await one(
    `update enquiries set status = 'replied', replied_at = now() where id = $1
     returning id, created_at, name, email, project, timeline, message, status, notes, replied_at`, [e.id]);
  sendJson(res, 200, { ok: true, reply, enquiry });
}
