/* Supabase over its REST API (PostgREST + Auth). No client library:
   plain fetch with the secret key, which never leaves the server. */
import { env, HttpError } from "./http.mjs";

const base = () => env("SUPABASE_URL").replace(/\/+$/, "");

function headers(extra = {}) {
  const key = env("SUPABASE_SERVICE_KEY");
  if (!base() || !key) throw new HttpError(503, "The database isn't connected yet (SUPABASE_URL / SUPABASE_SERVICE_KEY).");
  const h = { apikey: key, "Content-Type": "application/json", ...extra };
  // Legacy service_role keys are JWTs and go in Authorization too; new sb_secret_ keys only go in apikey.
  if (!key.startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}

async function call(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data };
}

/* db("enquiries?select=*&order=created_at.desc")
   db("enquiries", { method: "POST", body: {...} })  → returns the saved rows */
export async function db(path, { method = "GET", body } = {}) {
  const { res, data } = await call(`${base()}/rest/v1/${path}`, {
    method,
    headers: headers(method === "GET" ? {} : { Prefer: "return=representation" }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    const e = new HttpError(res.status === 409 ? 409 : 502, `Database error ${res.status}`);
    e.detail = data;
    console.error("Supabase", res.status, data);
    throw e;
  }
  return data;
}

export const eq = v => `eq.${encodeURIComponent(v)}`;

/* ---- Auth (only used by the desk) ---- */
export async function signIn(email, password) {
  const { res, data } = await call(`${base()}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: headers(), body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new HttpError(401, "That email and password don't match.");
  return data;
}

export async function refresh(refresh_token) {
  const { res, data } = await call(`${base()}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST", headers: headers(), body: JSON.stringify({ refresh_token })
  });
  if (!res.ok) throw new HttpError(401, "Your session ended. Sign in again.");
  return data;
}

export async function userFor(accessToken) {
  const h = headers();
  h.Authorization = `Bearer ${accessToken}`;
  const { res, data } = await call(`${base()}/auth/v1/user`, { headers: h });
  if (!res.ok || !data || !data.email) throw new HttpError(401, "Your session ended. Sign in again.");
  return data;
}
