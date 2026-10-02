// Shunyaakar backend: one small Node server (no framework) that
//   - serves the website and the /desk page,
//   - takes the contact form and newsletter sign-ups into Supabase Postgres,
//   - runs the desk's API behind database-checked admin sessions.
import http from "node:http";
import { config, assertConfig } from "./config.js";
import { pool, migrate } from "./db.js";
import { ensureAdmin, getDummyHash } from "./auth.js";
import { HttpError, sendJson, sendPage, wantsJson } from "./http.js";
import { securityHeaders, setCsp, buildCsp, inlineScriptHashes, rateLimiter, clientIp } from "./security.js";
import { serveStatic, readSiteFile } from "./static.js";
import * as pub from "./routes/public.js";
import * as auth from "./routes/auth.js";
import * as desk from "./routes/desk.js";

assertConfig();

const ID = "([0-9a-fA-F-]{36})";
const routes = [
  ["GET", /^\/api\/health$/, pub.health],
  ["POST", /^\/api\/contact$/, pub.contact],
  ["POST", /^\/api\/subscribe$/, pub.subscribe],
  ["OPTIONS", /^\/api\/(contact|subscribe)$/, pub.preflight],
  ["POST", /^\/api\/auth\/login$/, auth.login],
  ["POST", /^\/api\/auth\/logout$/, auth.logout],
  ["GET", /^\/api\/auth\/me$/, auth.me],
  ["GET", /^\/api\/desk\/overview$/, desk.overview],
  ["PATCH", new RegExp(`^/api/desk/enquiries/${ID}$`), desk.updateEnquiry],
  ["DELETE", new RegExp(`^/api/desk/enquiries/${ID}$`), desk.deleteEnquiry],
  ["POST", new RegExp(`^/api/desk/enquiries/${ID}/reply$`), desk.replyEnquiry],
  ["DELETE", new RegExp(`^/api/desk/subscribers/${ID}$`), desk.deleteSubscriber]
];

const apiLimit = rateLimiter({ windowMs: 60_000, max: 240 }); // per IP, across the whole API

async function handleApi(req, res, pathname) {
  res.setHeader("X-Robots-Tag", "noindex");
  const wait = apiLimit(clientIp(req));
  if (wait) throw new HttpError(429, "Too many requests. Slow down a little.", { "Retry-After": String(wait) });
  const matches = routes.filter(([, re]) => re.test(pathname));
  if (!matches.length) throw new HttpError(404, "Not found.");
  // HEAD is answered like GET, without a body (uptime monitors often use HEAD on /api/health)
  const method = req.method === "HEAD" ? "GET" : req.method;
  const route = matches.find(([m]) => m === method);
  if (!route) throw new HttpError(405, "Method not allowed.", { Allow: matches.map(([m]) => m === "GET" ? "GET, HEAD" : m).join(", ") });
  const m = route[1].exec(pathname);
  await route[2](req, res, { id: m[1] });
}

async function handle(req, res) {
  const started = Date.now();
  securityHeaders(res);
  if ((req.url || "").length > 2048) { res.writeHead(414); res.end(); return; }
  let pathname;
  try { pathname = new URL(req.url, "http://x").pathname; } catch { res.writeHead(400); res.end(); return; }

  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, pathname);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(`api: ${req.method} ${pathname} failed:`, err.message);
      // Our own HttpError messages are written for people; anything unexpected stays generic.
      const message = err instanceof HttpError && status !== 500 ? err.message : "Something went wrong on our side. Please try again.";
      if (res.headersSent) res.destroy();
      else if (!wantsJson(req) && req.method === "POST") sendPage(res, status, "That didn't go through", message); // a form posted without JavaScript
      else sendJson(res, status, { ok: false, error: message }, { ...pub.corsFor(req, pathname), ...err.headers }); // CORS so allowed sites can read the error
    }
    if (pathname !== "/api/health") console.log(`${req.method} ${pathname} ${res.statusCode} ${Date.now() - started}ms`);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
  }
  try {
    if (await serveStatic(req, res, pathname)) return;
    if (!(await serveStatic(req, res, "/404.html", { status: 404 }))) { res.writeHead(404); res.end("Not found"); }
  } catch (err) {
    console.error(`static: ${pathname} failed:`, err.message);
    if (!res.headersSent) { res.writeHead(500); res.end(); } else res.destroy();
  }
}

async function start() {
  // The database may still be waking up (Supabase free projects pause): retry a few times.
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate();
      await ensureAdmin();
      break;
    } catch (err) {
      if (attempt >= 5) { console.error("startup: database not reachable:", err.message); process.exit(1); }
      console.warn(`startup: database not ready (${err.message}), retrying…`);
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }

  await getDummyHash(); // ready before the first sign-in, so timing is even from the start
  const docs = await Promise.all(["index.html", "404.html", "desk/index.html"].map(f => readSiteFile(f).catch(() => "")));
  setCsp(buildCsp(inlineScriptHashes(docs)));

  const server = http.createServer((req, res) => { handle(req, res); });
  server.requestTimeout = 30_000;
  server.headersTimeout = 66_000;
  server.keepAliveTimeout = 65_000; // longer than Render's load balancer idle timeout
  server.maxHeadersCount = 64;
  server.listen(config.port, "0.0.0.0", () => console.log(`shunyaakar backend listening on :${config.port} (${config.production ? "production" : "development"})`));

  const shutdown = signal => {
    console.log(`${signal}: shutting down`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", err => console.error("unhandled rejection:", err));
start();
