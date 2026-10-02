#!/usr/bin/env node
// Creates the admin account, or sets a new password for it, straight in the database.
//   cd backend && npm run create-admin
// Asks for the email and password (the password isn't shown or stored anywhere but as a
// scrypt hash). Setting a new password signs out every existing desk session.
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { config } from "../src/config.js";
import { pool, migrate, one, query } from "../src/db.js";
import { hashPassword } from "../src/auth.js";
import { cleanEmail } from "../src/http.js";

let muted = false;
const out = new Writable({ write(chunk, enc, cb) { if (!muted) process.stdout.write(chunk, enc); cb(); } });
const rl = createInterface({ input: process.stdin, output: out, terminal: true });
const ask = (q, hidden = false) => new Promise(resolve => {
  process.stdout.write(q);
  muted = hidden;
  rl.question("", answer => { muted = false; if (hidden) process.stdout.write("\n"); resolve(answer); });
});

async function main() {
  if (!config.databaseUrl) throw new Error("DATABASE_URL isn't set. Put it in backend/.env or the repo-root .env.");
  const email = cleanEmail((await ask(`Admin email${config.adminEmail ? ` [${config.adminEmail}]` : ""}: `)) || config.adminEmail);
  if (!email) throw new Error("That email doesn't look right.");
  const password = await ask("New password (at least 12 characters): ", true);
  if (password.length < 12) throw new Error("The password must be at least 12 characters.");
  if (password !== await ask("Repeat it: ", true)) throw new Error("The two passwords don't match.");

  await migrate();
  const hash = await hashPassword(password);
  const row = await one(
    `insert into admin_users (email, role, password_hash) values ($1, 'admin', $2)
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin',
       failed_attempts = 0, locked_until = null
     returning id, (xmax = 0) as created`,
    [email, hash]
  );
  await query("delete from admin_sessions where user_id = $1", [row.id]);
  console.log(row.created ? `Admin account created for ${email}.` : `New password set for ${email}. All desk sessions were signed out.`);
}

main()
  .catch(err => { console.error(`Couldn't finish: ${err.message}`); process.exitCode = 1; })
  .finally(() => { rl.close(); pool.end(); });
