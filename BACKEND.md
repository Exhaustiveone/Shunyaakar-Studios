# The studio desk: backend setup

The site keeps its own records in **Supabase**, a database you own:

| Table | What's in it |
|---|---|
| `enquiries` | every message from the "Work with us" contact form, with its status and your notes |
| `enquiry_replies` | replies sent from the desk (only used if automatic email is switched on) |
| `subscribers` | everyone who signed up for "Letters from the set", and whether they're still on the list |
| `letters` | your newsletters: drafts while you write, then sent ones with the date and list size |

You manage all of it at **`yoursite/desk/`**, a private page that needs your login.

## How it fits together

```
visitor ── form ──▶ /api/contact, /api/subscribe      (Netlify Functions, in netlify/functions)
                         │
                         ▼
                     Supabase  ◀── /api/desk ◀── you, at /desk/ (login required)
```

| Service | What it does | Free plan |
|---|---|---|
| **Netlify** | Hosts the site and runs the small server functions | 125,000 function calls a month |
| **Supabase** | Postgres database, plus the desk login | 500 MB. The project pauses after a week with no activity; the daily `keepalive` function prevents that |

The site doesn't send emails itself. You send newsletters and replies from **your own Gmail**, and the desk does the copying for you (see "Sending a letter" below). Automatic sending through Resend is an optional extra, described at the end.

Secret keys live only in Netlify's environment variables and in your local `.env` file, which is never pushed to GitHub.

---

## One-time setup

### 0. Deploy Netlify from GitHub

Functions don't deploy with drag-and-drop. In Netlify: **Add new site → Import an existing project → GitHub → `Shunyaakar-Studios`**. Leave the build command empty. `netlify.toml` already sets everything else. From then on, every push to `main` goes live.

### 1. Supabase

Your project already exists and **the tables are already created**. For a fresh project, paste [`supabase/schema.sql`](supabase/schema.sql) into **SQL Editor → New query → Run**. It's safe to run again.

1. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Only you should have an account.
2. **Authentication → Users → Add user → Create new user**: your email and a strong password, with **Auto Confirm User** ticked. This is your desk login.
3. **Project Settings → API Keys → Secret keys**: copy the secret key (`sb_secret_…`). Treat it like a password.

### 2. Tell Netlify the secrets

In Netlify go to **Site configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `SUPABASE_URL` | your Project URL, `https://<project-ref>.supabase.co` (Project Settings → API; also in your local `.env`) |
| `SUPABASE_SERVICE_KEY` | the secret key from step 1.3 |
| `ADMIN_EMAIL` | the email you created in step 1.2 |

Then **Deploys → Trigger deploy → Deploy site**.

### 3. Try it

1. Send a message through the contact form on the live site.
2. Open `yoursite/desk/` and sign in. The enquiry is there.
3. Subscribe with another email in the footer. It shows up under **Letters**.

---

## Using the desk

### Enquiries

New ones have a pink dot, and the browser tab shows how many are new. Mark each as **Replied**, **Done** or **Spam** (spam is hidden from "All"). Notes save on their own and are private.

To reply, write in the reply box and press **Open in email app**. It opens Gmail or Mail with the message pre-filled and their original quoted. **Export** downloads what you're looking at as a CSV for Google Sheets or Excel.

There are no email alerts for new enquiries, so check the desk regularly. Alerts need an email service; see the optional section below.

### Sending a letter

1. Write it in the editor. It saves itself to the `letters` table as a draft, and **Save draft** saves right away. Drafts are listed under the editor, so you can finish one later on any device.
   - Formatting: leave blank lines between paragraphs, and use `# heading`, `**bold**`, `[link](https://…)` or `![caption](https://…/photo.jpg)`.
2. Press **Preview** to see it as it will land in an inbox.
3. **Copy the letter** copies it with the design, ready to paste.
4. **Copy N emails** copies everyone on the list.
5. **Open Gmail** opens a new message with the subject filled in. Paste the emails into **Bcc** (not To), so nobody sees anyone else's address. Paste the letter into the message and send.
6. Back in the desk, press **Mark as sent**. The letter moves to **Sent** with the date and the number of people.

Personal Gmail lets you email about **500 people a day**. Past that, send in parts on different days, or switch on automatic sending.

### Unsubscribing

Every letter ends with a link to **`yoursite/unsubscribe`**, where a reader types their email to leave the list. People who leave stay in the list as "Left", so they're never copied into Bcc again. You can also remove or add people by hand under **The list**. **Delete** erases someone completely, for when a person asks for their data to be removed.

---

## Demo mode (try the desk before setup)

Wherever the backend isn't connected yet (Live Server in Antigravity, or the live site before setup is done), `/desk/` switches to **demo mode**. It runs on sample enquiries, subscribers and letters kept only in your browser. Nothing is saved online.

- **Email:** `demo@shunyaakar.test`
- **Password:** `shunyaakar-demo`

The login screen shows these, with a "Fill it in for me" button. "Reset sample data" in the orange bar starts the demo over. Once Supabase is connected, demo mode switches off by itself and only your real login works.

## Testing locally

Live Server in Antigravity only serves files, so the functions don't run there. The contact form falls back to opening your email app, and the desk runs in demo mode. Test backend changes on a **Netlify deploy preview** (push to a branch) or on the live site.

If you ever want the whole backend on your Mac, install Node.js from [nodejs.org](https://nodejs.org), then run `npx netlify-cli dev` in the project folder.

---

## Optional: automatic email (Resend)

Not needed now. If you later want email alerts for new enquiries, "Got your message" replies, welcome emails, and one-click newsletter sending with personal unsubscribe links, the code for it is already in place:

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Add `RESEND_API_KEY` and `NOTIFY_EMAIL` (where alerts go) in Netlify.
   - Without a domain, `NOTIFY_EMAIL` must be the email you signed up to Resend with. Only your own alerts and tests go out.
3. After buying a domain, verify it in Resend (**Domains → Add domain**, add the DNS records, press Verify). Then add:
   - `MAIL_FROM`, e.g. `Shunyaakar <letters@shunyaakar.com>`
   - `REPLY_TO`, your inbox
   - `SITE_URL`, e.g. `https://shunyaakar.com`

   With those, the desk gains "Send a test to me" and "Send to N people" buttons, and a Send button for replies.

The free plan covers 100 emails a day and 3,000 a month.

## Files

```
netlify.toml                 Netlify settings (functions folder, desk headers, hides repo files)
netlify/functions/
  contact.mjs                POST /api/contact     save the enquiry (+ alert, if Resend is on)
  subscribe.mjs              POST /api/subscribe   add to the list (+ welcome email, if on)
  unsubscribe.mjs            /unsubscribe          leave the list by email (or ?t= personal link)
  desk.mjs                   POST /api/desk        everything the desk does (login required)
  keepalive.mjs              daily ping so Supabase doesn't pause
netlify/lib/
  http.mjs                   request/response helpers, validation
  db.mjs                     Supabase REST + login
  mail.mjs                   email templates (+ Resend, optional)
supabase/schema.sql          the tables (safe to re-run)
desk/                        the desk page (index.html, desk.css, desk.js, demo.js)
```

No npm packages: the functions use plain `fetch`.
