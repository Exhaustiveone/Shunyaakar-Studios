// Serves the website (index.html, css/, js/, assets/, desk/) from the repo root.
// Only allow-listed paths are reachable: the backend's own code, docs, .env files and
// anything else in the repo can never be fetched. Small text files are kept in memory
// pre-compressed; ETags give cheap 304s; big media files stream with Range support.
import { stat, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { SITE_DIR } from "./config.js";

const PUBLIC_FILES = new Set(["index.html", "404.html", "favicon.ico", "robots.txt", "site.webmanifest"]);
const PUBLIC_DIRS = ["css/", "js/", "assets/", "desk/"];

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2", ".woff": "font/woff", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
  ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf"
};
const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg)/;
const MEMORY_LIMIT = 2 * 1024 * 1024;
const cache = new Map(); // rel path -> { mtimeMs, size, etag, body, gz }

// Maps a URL path to a safe file path inside the site, or null.
function resolve(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes("\0") || p.includes("\\")) return null;
  if (p === "/") p = "/index.html";
  if (p === "/desk/") p = "/desk/index.html";
  const rel = path.posix.normalize(p).replace(/^\/+/, "");
  if (!rel || rel.startsWith("..") || rel.split("/").some(seg => seg.startsWith("."))) return null;
  if (!PUBLIC_FILES.has(rel) && !PUBLIC_DIRS.some(d => rel.startsWith(d))) return null;
  const abs = path.join(SITE_DIR, rel);
  return abs.startsWith(SITE_DIR + path.sep) ? { rel, abs } : null;
}

function cacheControl(rel) {
  if (rel.startsWith("desk/")) return "no-store";
  if (rel.startsWith("assets/")) return "public, max-age=604800"; // images, audio: a week
  return "no-cache"; // html, css, js: always revalidate (cheap 304s via ETag)
}

async function load(file, st) {
  const hit = cache.get(file.rel);
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit;
  const body = await readFile(file.abs);
  const type = TYPES[path.extname(file.rel).toLowerCase()] || "application/octet-stream";
  const entry = {
    mtimeMs: st.mtimeMs, size: st.size, type,
    etag: `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`,
    body, gz: COMPRESSIBLE.test(type) && body.length > 1024 ? gzipSync(body, { level: 9 }) : null
  };
  cache.set(file.rel, entry);
  return entry;
}

export async function readSiteFile(rel) {
  return readFile(path.join(SITE_DIR, rel), "utf8");
}

// Returns true if it answered, false if there's no such public file.
export async function serveStatic(req, res, urlPath, { status = 200 } = {}) {
  if (urlPath === "/desk") { res.writeHead(301, { Location: "/desk/" }); res.end(); return true; }
  const file = resolve(urlPath);
  if (!file) return false;
  let st;
  try { st = await stat(file.abs); } catch { return false; }
  if (!st.isFile()) return false;

  const headers = { "Cache-Control": status === 200 ? cacheControl(file.rel) : "no-store", Vary: "Accept-Encoding" };
  if (file.rel.startsWith("desk/")) {
    headers["X-Robots-Tag"] = "noindex, nofollow";
    headers["Referrer-Policy"] = "no-referrer";
  }

  // Large files (video, long audio): stream from disk, with byte ranges for seeking.
  if (st.size > MEMORY_LIMIT) {
    const type = TYPES[path.extname(file.rel).toLowerCase()] || "application/octet-stream";
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    let start = 0, end = st.size - 1, code = status;
    if (range && status === 200) {
      start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) {
        res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); res.end(); return true;
      }
      code = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${st.size}`;
    }
    res.writeHead(code, { ...headers, "Content-Type": type, "Content-Length": end - start + 1, "Accept-Ranges": "bytes" });
    if (req.method === "HEAD") { res.end(); return true; }
    createReadStream(file.abs, { start, end }).on("error", () => res.destroy()).pipe(res);
    return true;
  }

  const entry = await load(file, st);
  headers.ETag = entry.etag;
  if (status === 200 && req.headers["if-none-match"] === entry.etag) { res.writeHead(304, headers); res.end(); return true; }
  const useGzip = entry.gz && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  const body = useGzip ? entry.gz : entry.body;
  res.writeHead(status, {
    ...headers, "Content-Type": entry.type, "Content-Length": body.length,
    ...(useGzip ? { "Content-Encoding": "gzip" } : {})
  });
  res.end(req.method === "HEAD" ? undefined : body);
  return true;
}
