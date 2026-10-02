# Shunyaakar backend

One small Node.js server that runs the whole site on **Render**:

- serves the website (`index.html`, `css/`, `js/`, `assets/`) and the private **`/desk`**
- `POST /api/contact`: "Work with us" enquiries → `enquiries` table
- `POST /api/subscribe`: newsletter sign-ups → `newsletter_subscribers` table (stored only, never sent anywhere)
- the desk's sign-in and data API, checked against the database on every request

Its only dependency is [`pg`](https://node-postgres.com), the standard PostgreSQL driver. There's no framework and no build step. The database is your **Supabase** Postgres.

## Deploy on Render

1. **Push this repo to GitHub** (already done if you're reading this there).
2. In Render: **New → Blueprint**, then pick the `Shunyaakar-Studios` repo. Render reads [`render.yaml`](../render.yaml) and sets up the service: build `cd backend && npm ci --omit=dev`, start `node src/server.js`, health check `/api/health`, region Singapore.
3. Render asks for three values:

   | Variable | What to put |
   |---|---|
   | `DATABASE_URL` | Supabase → **Connect** → *Session pooler* connection string, with your database password filled in. (Render has no IPv6, so use the pooler, not the "direct connection".) |
   | `ADMIN_EMAIL` | the email that can open the desk |
   | `ADMIN_PASSWORD` | a strong password for the desk, at least 12 characters |

4. **Deploy.** On first start the server creates its tables and stores `ADMIN_EMAIL` in `admin_users` with role `admin`, with the password hashed.
5. Open `https://<your-service>.onrender.com/desk/` and sign in.
6. To change the password later, change `ADMIN_PASSWORD` (in `.env` locally, or Render's Environment tab) and restart/redeploy. The server re-hashes it and signs out old sessions.

That's all. Every push to `main` redeploys.

### Custom domain

When you buy one, go to Render → your service → **Settings → Custom Domains**. Render issues the HTTPS certificate itself.

## How the desk sign-in works

- **The admin account lives in the database.** `admin_users` holds the `email`, `role` = `admin` and a `password_hash`. The frontend doesn't contain the admin's email; it just sends what you type to `/api/auth/login`.
- **Passwords are hashed with scrypt.** It's a memory-hard hash with a random salt, checked in constant time.
- **Wrong attempts are rate-limited twice over:**
  - **Per IP:** 10 attempts per 15 minutes.
  - **Per account:** 5 wrong passwords lock that account for 15 minutes.
  - **No hints:** a wrong email and a wrong password get the same message and take the same time, so nobody can find out which emails exist.
- **Sessions:**
  - **Token:** a successful sign-in creates a random 256-bit token, stored in the browser as a cookie the page's own scripts can't read (`HttpOnly`), sent only over HTTPS (`Secure`) and only to this site (`SameSite=Strict`).
  - **Storage:** the database keeps only a SHA-256 hash of the token (`admin_sessions`).
  - **Every request is re-checked:** each desk request looks up the session *and* checks the user's role is still `admin`.
  - **Lifetime:** sign-ins last 72 hours (`SESSION_HOURS`).
- **Signing out** deletes the session row, so an old cookie stops working immediately.

### Change the password or the admin

- **Changing the password, from your computer:** put `DATABASE_URL` in the repo-root `.env` (or `backend/.env`), then run:

  ```bash
  cd backend && npm install && npm run create-admin
  ```

  It asks for the email and the new password, without showing the password, and signs out all existing sessions.
- **Changing the password, from Render only:** set `ADMIN_PASSWORD` to the new password and `ADMIN_PASSWORD_RESET=true`, redeploy, then remove both.

## Security, in short

| Area | What's done |
|---|---|
| SQL injection | Every query is parameterised (`$1, $2…`); user input is never put into SQL text. Inputs are also type-checked, Unicode-normalised, stripped of control characters and length-capped, and the database has `check` constraints too. |
| Newsletter emails | Validated, lowercased and inserted, nothing else. The same reply whether or not the email already exists, so the list can't be probed. |
| Spam and floods | Honeypot fields; per-IP limits (contact 8 per 10 min, sign-up 10 per 10 min, whole API 240 per min); at most 3 enquiries per email per 10 min; 16 KB body limit; JSON or form posts only. |
| Cross-site attacks | Desk changes require the request to come from this site (`Origin` check) on top of `SameSite=Strict` cookies; the form endpoints refuse other sites unless they're listed in `ALLOWED_ORIGINS`. |
| Browser headers | A strict Content-Security-Policy (scripts only from this site, inline scripts allowed only by hash), plus HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. `/desk` is `noindex`, `no-store` and `no-referrer`. |
| Files | Only `index.html`, `404.html`, `css/`, `js/`, `assets/` and `desk/` can be fetched. The backend code, `.env`, docs and the rest of the repo can't be, and path tricks like `../` are refused. |
| Database | Supabase's public REST API is locked out of every table (row-level security on, no policies, rights revoked from `anon` and `authenticated`). The server connects as the database owner over TLS. |
| Errors | The server logs the real error but sends the visitor only a plain message. No stack traces, SQL or internals leave the server. |

## Running it on your computer

```bash
cd backend
npm install
npm run dev        # http://localhost:3000, restarts on file changes
```

It reads `backend/.env`, or the repo-root `.env`, for `DATABASE_URL`; [`.env.example`](.env.example) lists every option. Locally it runs over plain HTTP, so the cookie isn't marked `Secure`; on Render it is.

Opening the site with Live Server instead, with no backend running, still works for the pages. The forms fall back to opening an email, and `/desk` offers a **demo mode** with sample data (login `demo@shunyaakar.test` / `shunyaakar-demo`). Demo mode only ever appears on `localhost` when the backend isn't reachable, never on the real site.

## Optional settings

| Variable | Default | Purpose |
|---|---|---|
| `SESSION_HOURS` | `72` | how long a desk sign-in lasts |
| `DATABASE_CA_CERT` | (none) | Supabase's CA certificate (Project Settings → Database → SSL), as PEM text. With it, the database server's certificate is verified too; without it the connection is still encrypted. |
| `DB_POOL_MAX` | `5` | database connections the server may hold |
| `ALLOWED_ORIGINS` | (none) | other sites allowed to post the two forms, comma separated |
| `ADMIN_PASSWORD_RESET` | `false` | with `ADMIN_PASSWORD`: replace the existing password once |

## Free-plan notes

- **Render's free web services sleep after 15 minutes without visits.** The first visit after that takes about a minute to wake up. A paid instance ($7/month) stays awake.
- **Supabase pauses free projects after a week without database activity.** Render's health check (`/api/health`) queries the database, but only while the service is awake. To keep both awake, point a free uptime monitor (UptimeRobot, Better Stack) at `https://<your-service>.onrender.com/api/health` every 10 minutes.

## Files

```
backend/
  src/server.js         HTTP server: routing, error handling, startup, graceful shutdown
  src/config.js         environment variables (nothing secret in code)
  src/db.js             Postgres pool, parameterised queries, schema migration on start
  src/auth.js           scrypt passwords, sessions, the admin account
  src/security.js       CSP and security headers, rate limits, origin checks, client IP
  src/http.js           body parsing with size limits, input cleaning, JSON/HTML replies
  src/static.js         allow-listed static files, gzip, ETags, byte ranges
  src/routes/public.js  /api/contact, /api/subscribe, /api/health
  src/routes/auth.js    /api/auth/login, /logout, /me
  src/routes/desk.js    /api/desk/overview, enquiries (update, delete), sign-ups (delete)
  db/schema.sql         tables, constraints, row-level security (idempotent; runs on start)
  scripts/create-admin.js   set the admin password from a terminal
render.yaml             the Render Blueprint (in the repo root)
```
