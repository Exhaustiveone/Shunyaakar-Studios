// Postgres access. Every query is parameterised ($1, $2 …): values never get
// spliced into SQL text, which is what makes SQL injection impossible here.
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config, BACKEND_DIR } from "./config.js";

const ssl = config.databaseCaCert
  ? { ca: config.databaseCaCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false }; // still encrypted; add DATABASE_CA_CERT to verify the server too

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(config.databaseUrl) ? false : ssl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 8_000,
  query_timeout: 10_000,
  application_name: "shunyaakar-backend"
});

pool.on("error", err => console.error("db: idle client error", err.message));

export const query = (text, values = []) => pool.query(text, values);

export async function one(text, values) {
  const { rows } = await pool.query(text, values);
  return rows[0] || null;
}

// Runs db/schema.sql in one transaction, under a transaction-level advisory lock
// so two instances starting together can't race each other.
export async function migrate() {
  const sql = await readFile(path.join(BACKEND_DIR, "db", "schema.sql"), "utf8");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(7242610001)");
    await client.query(sql);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function ping() {
  await pool.query("select 1");
}
