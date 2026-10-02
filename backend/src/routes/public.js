// Public endpoints used by the website's two forms, plus a health check for Render.
import { query, one, ping } from "../db.js";
import { HttpError, sendJson, sendPage, readBody, clean, cleanEmail, wantsJson } from "../http.js";
import { clientIp, rateLimiter, publicOriginAllowed, corsHeaders } from "../security.js";

// per IP; generous enough for people sharing one network (a college Wi-Fi), tight enough to stop floods
const contactLimit = rateLimiter({ windowMs: 10 * 60_000, max: 8 });
const subscribeLimit = rateLimiter({ windowMs: 10 * 60_000, max: 10 });

function guard(req, limiter) {
  if (!publicOriginAllowed(req)) throw new HttpError(403, "This form can only be sent from the Shunyaakar site.");
  const wait = limiter(clientIp(req));
  if (wait) throw new HttpError(429, "That's a few too many at once. Try again in a few minutes.", { "Retry-After": String(wait) });
}

const reply = (req, res, title, message) =>
  wantsJson(req) ? sendJson(res, 200, { ok: true }, corsHeaders(req)) : sendPage(res, 200, title, message);

// POST /api/contact — "Work with us"
export async function contact(req, res) {
  guard(req, contactLimit);
  const b = await readBody(req, { allowForm: true });
  const thanks = () => reply(req, res, "Received", "Thank you. Your message is on my desk, and I'll reply within two days.");
  if (clean(b.company, 200)) return thanks(); // honeypot field filled in: a bot. Say thanks, store nothing.

  const e = {
    name: clean(b.name, 120),
    email: cleanEmail(b.email),
    project: clean(b.project, 120) || null,
    timeline: clean(b.timeline, 200) || null,
    message: clean(b.message, 5000, { multiline: true })
  };
  if (!e.name || !e.email || !e.message) throw new HttpError(400, "Please add your name, a valid email and a message.");

  // At most three messages from one address in ten minutes, whatever IP they come from.
  const recent = await one(
    "select count(*)::int as n from enquiries where email = $1 and created_at > now() - interval '10 minutes'",
    [e.email]
  );
  if (recent.n >= 3) throw new HttpError(429, "That's a few messages at once. Give it ten minutes and try again.", { "Retry-After": "600" });

  await query(
    "insert into enquiries (name, email, project, timeline, message) values ($1, $2, $3, $4, $5)",
    [e.name, e.email, e.project, e.timeline, e.message]
  );
  return thanks();
}

// POST /api/subscribe — "Letters from the set". The email is validated and stored. Nothing else.
export async function subscribe(req, res) {
  guard(req, subscribeLimit);
  const b = await readBody(req, { allowForm: true });
  const done = () => reply(req, res, "You're on the list", "Thank you for signing up.");
  if (clean(b.website, 200)) return done(); // honeypot

  const email = cleanEmail(b.email);
  if (!email) throw new HttpError(400, "That email doesn't look right.");
  // Same answer whether or not it was already there, so the list can't be probed.
  await query("insert into newsletter_subscribers (email) values ($1) on conflict (email) do nothing", [email]);
  return done();
}

// OPTIONS preflight for the two form endpoints (only matters if ALLOWED_ORIGINS is used)
export function preflight(req, res) {
  const headers = corsHeaders(req);
  res.writeHead(Object.keys(headers).length ? 204 : 403, headers);
  res.end();
}

// GET /api/health — Render's health check. Also confirms the database answers.
export async function health(req, res) {
  try {
    await ping();
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 503, { ok: false });
  }
}
