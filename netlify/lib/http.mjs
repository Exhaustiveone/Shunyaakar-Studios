/* Small helpers shared by the Netlify functions. Web-standard APIs only
   (Request, Response, fetch), so there is nothing to install. */

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const env = name => (globalThis.process && process.env[name]) || "";

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

// The site's own scripts send JSON; a plain HTML form (no JavaScript) sends urlencoded.
export const wantsJSON = req => /json/.test(req.headers.get("accept") || "") || /json/.test(req.headers.get("content-type") || "");

export async function readBody(req) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return (await req.json().catch(() => null)) || {};
  return Object.fromEntries(new URLSearchParams(await req.text()));
}

export const clean = (v, max) => String(v ?? "").replace(/\u0000/g, "").trim().slice(0, max);
export const isEmail = s => s.length <= 254 && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:.]{2,}$/.test(s);
export const isId = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
export const origin = req => (env("SITE_URL") || new URL(req.url).origin).replace(/\/+$/, "");

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A tiny standalone page in the site's palette, for no-JavaScript form posts and unsubscribe links.
export function page(title, bodyHTML, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} | Shunyaakar</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600&family=Unbounded:wght@700&display=swap" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0A1C;color:#F6F0E6;font:1.0625rem/1.6 "Bricolage Grotesque",system-ui,sans-serif;padding:24px}
  main{max-width:34rem}
  .bar{display:flex;height:6px;margin-bottom:28px}.bar i{flex:1}
  h1{font:700 clamp(1.6rem,6vw,2.4rem)/1.15 Unbounded,"Arial Black",sans-serif;margin:0 0 .6em;letter-spacing:-.01em}
  p{color:#D8D1E6;margin:0 0 1em}
  a,button{color:#0E0A1C;background:#FFB224;border:0;border-radius:999px;padding:.8em 1.4em;font:600 1rem "Bricolage Grotesque",system-ui,sans-serif;text-decoration:none;display:inline-block;cursor:pointer}
  a.plain{background:none;color:#F6F0E6;text-decoration:underline;padding:0}
  :focus-visible{outline:2px solid #FFB224;outline-offset:3px}
</style></head><body><main>
<div class="bar"><i style="background:#FF3D8B"></i><i style="background:#FFB224"></i><i style="background:#13C2B0"></i><i style="background:#4B63FF"></i></div>
<h1>${esc(title)}</h1>${bodyHTML}</main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Wraps a handler so any thrown HttpError becomes a clean JSON (or HTML) answer.
export function handle(fn) {
  return async (req, context) => {
    try {
      return await fn(req, context);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status >= 500) console.error(e);
      const message = e instanceof HttpError ? e.message : "Something went wrong on our side. Please try again.";
      if (!wantsJSON(req)) return page("That didn't go through", `<p>${esc(message)}</p><p><a class="plain" href="/">Back to the site</a></p>`, status);
      return json({ ok: false, error: message }, status);
    }
  };
}
