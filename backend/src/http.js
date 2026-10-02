// Request/response helpers: JSON replies, size-limited body parsing, input cleaning.

export class HttpError extends Error {
  constructor(status, message, headers) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

const MAX_BODY = 16 * 1024; // forms are small; anything bigger is refused before it's buffered

// Reads a JSON body (the site's own scripts) or an urlencoded body (plain HTML form posts).
export async function readBody(req, { allowForm = false } = {}) {
  const type = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const isJson = type === "application/json";
  const isForm = allowForm && type === "application/x-www-form-urlencoded";
  if (!isJson && !isForm) throw new HttpError(415, "Send the form as JSON.");

  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_BODY) throw new HttpError(413, "That's too much text.");

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, "That's too much text.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  if (isForm) return Object.fromEntries(new URLSearchParams(raw));
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not an object");
    return data;
  } catch {
    throw new HttpError(400, "The request wasn't valid JSON.");
  }
}

// Normalises user text: Unicode NFC, no control characters (newlines and tabs kept
// where asked), trimmed, capped. Only strings are accepted; anything else becomes "".
export function clean(value, max, { multiline = false } = {}) {
  if (typeof value !== "string") return "";
  const controls = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return value.normalize("NFC").replace(/\r\n?/g, "\n").replace(controls, "").trim().slice(0, max);
}

export function cleanEmail(value) {
  const email = clean(value, 254).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}
const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export const isUuid = s => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    if (!(k in out)) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const wantsJson = req => /json/.test(req.headers.accept || "") || /json/.test(req.headers["content-type"] || "");

const escMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => escMap[c]);

// A small standalone page in the site's palette, for form posts made without JavaScript.
export function sendPage(res, status, title, message) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} | Shunyaakar</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0A1C;color:#F6F0E6;font:1.0625rem/1.6 system-ui,sans-serif;padding:24px}
main{max-width:34rem}.bar{display:flex;height:6px;margin-bottom:28px}.bar i{flex:1}h1{font:800 2rem/1.15 system-ui,sans-serif;margin:0 0 .6em}
p{color:#D8D1E6}a{color:#0E0A1C;background:#FFB224;border-radius:999px;padding:.8em 1.4em;font-weight:700;text-decoration:none;display:inline-block}</style>
</head><body><main><div class="bar"><i style="background:#FF3D8B"></i><i style="background:#FFB224"></i><i style="background:#13C2B0"></i><i style="background:#4B63FF"></i></div>
<h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="/">Back to the site</a></p></main></body></html>`;
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html), "Cache-Control": "no-store" });
  res.end(html);
}
