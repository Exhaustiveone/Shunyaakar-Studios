/* Runs once a day. Supabase pauses free projects after a quiet week;
   a tiny daily read keeps the database awake. */
import { db } from "../lib/db.mjs";

export default async () => {
  try { await db("subscribers?select=id&limit=1"); }
  catch (e) { console.error("keepalive", e.message); }
};

export const config = { schedule: "@daily" };
