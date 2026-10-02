// The desk's data. Every handler starts with requireAdmin (session + role, checked in the database).
import { query, one } from "../db.js";
import { HttpError, sendJson, readBody, clean, isUuid } from "../http.js";
import { requireAdmin } from "./auth.js";

const STATUSES = ["new", "replied", "done", "spam"];
const LIMIT = 2000;

// GET /api/desk/overview — everything the desk shows, in one round trip
export async function overview(req, res) {
  const s = await requireAdmin(req);
  const [enquiries, subscribers] = await Promise.all([
    query(
      `select id, created_at, name, email, project, timeline, message, status, notes, replied_at
         from enquiries order by created_at desc limit $1`, [LIMIT]),
    query("select id, created_at, email from newsletter_subscribers order by created_at desc limit $1", [LIMIT])
  ]);
  sendJson(res, 200, { ok: true, me: s.user.email, enquiries: enquiries.rows, subscribers: subscribers.rows });
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
