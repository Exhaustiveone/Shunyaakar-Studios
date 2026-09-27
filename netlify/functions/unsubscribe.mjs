/* /unsubscribe  (also /api/unsubscribe)
   Two ways out of "Letters from the set":
   - with a personal link (?t=<token>): GET shows a confirm button (so link scanners in mail apps
     can't unsubscribe people by accident); POST does it, which also covers one-click
     List-Unsubscribe in Gmail and Apple Mail.
   - without a token (letters sent from Gmail carry one shared link): the page asks for the email.
     The answer is the same whether or not the email is on the list, so the list can't be probed. */
import { handle, page, esc, isId, isEmail, clean, readBody, HttpError } from "../lib/http.mjs";
import { db, eq } from "../lib/db.mjs";

const gone = () => ({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() });
const back = `<p><a class="plain" href="/">Back to the site</a></p>`;
const form = (msg = "") => page("Leave the list", `
  <p>Enter the email you signed up with and you'll stop getting Letters from the set.</p>
  ${msg ? `<p style="color:#FF3D8B">${esc(msg)}</p>` : ""}
  <form method="post" action="/unsubscribe" style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 1em">
    <label style="flex:1 1 220px"><span style="position:absolute;left:-9999px">Email</span>
      <input name="email" type="email" required autocomplete="email" placeholder="Your email"
        style="width:100%;box-sizing:border-box;padding:.8em 1em;border-radius:999px;border:1.5px solid rgba(246,240,230,.3);background:#07050F;color:#F6F0E6;font:inherit"></label>
    <button type="submit">Unsubscribe</button>
  </form>${back}`, msg ? 400 : 200);

export default handle(async req => {
  const token = new URL(req.url).searchParams.get("t") || "";

  if (!token) {
    if (req.method !== "POST") return form();
    const email = clean((await readBody(req)).email, 254).toLowerCase();
    if (!isEmail(email)) return form("That email doesn't look right.");
    await db(`subscribers?email=${eq(email)}&status=eq.subscribed`, { method: "PATCH", body: gone() });
    return page("You're off the list", `<p>If ${esc(email)} was on the list, it won't get any more letters. Thank you for reading them.</p>${back}`);
  }

  if (!isId(token)) throw new HttpError(400, "This unsubscribe link is incomplete. Try copying the whole link from the email.");

  if (req.method === "POST") {
    await db(`subscribers?token=${eq(token)}`, { method: "PATCH", body: gone() });
    return page("You're off the list", `<p>No more letters from the set. Thank you for reading them.</p>${back}`);
  }

  const [sub] = await db(`subscribers?select=email,status&token=${eq(token)}`);
  if (!sub) throw new HttpError(404, "We couldn't find that subscription. It may already be removed.");
  if (sub.status === "unsubscribed") return page("Already off the list", `<p>${esc(sub.email)} won't get any more letters.</p>${back}`);
  return page("Leave the list?", `<p>${esc(sub.email)} will stop getting Letters from the set.</p>
    <form method="post" action="/unsubscribe?t=${esc(token)}"><button type="submit">Unsubscribe</button></form>`);
});

export const config = { path: ["/unsubscribe", "/api/unsubscribe"] };
