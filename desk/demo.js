/* =====================================================================
   STUDIO DESK — DEMO MODE
   Loaded only when the real backend isn't reachable or isn't set up yet
   (Live Server in Antigravity, or before BACKEND.md is done). It answers
   the desk's API calls from sample data kept in this browser. Nothing is
   sent and nothing reaches a database.

   Demo login:  demo@shunyaakar.test  /  shunyaakar-demo
   ===================================================================== */
window.DeskDemo = (() => {
  "use strict";
  const EMAIL = "demo@shunyaakar.test";
  const PASSWORD = "shunyaakar-demo";
  const STORE = "shunyaakar-desk-demo";
  const FROM = "Shunyaakar <letters@shunyaakar.com>";

  const id = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  const ago = (days, hours = 0) => new Date(Date.now() - (days * 86400 + hours * 3600) * 1000).toISOString();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fail = (status, message) => Object.assign(new Error(message), { status });

  function seed() {
    const e = (name, email, project, timeline, message, status, when, notes = null) =>
      ({ id: id(), created_at: when, name, email, project, timeline, message, status, notes, replied_at: status === "replied" ? when : null });
    const enquiries = [
      e("Riya Sharma", "riya.sharma@example.com", "Music video", "Shooting in November",
        "Hi Mayank,\n\nI'm an independent artist releasing my first single in December. I'm looking for someone to shoot and cut the video. Something moody, mostly at night, around the old city.\n\nCould we talk this week?\n\nRiya", "new", ago(0, 2)),
      e("Aman Kumar", "aman.k@example.com", "A role in AHAM (cast or crew)", null,
        "I'd like to be considered for Veer / The Other in AHAM.\n\nAbout me: three years of theatre at Ravindra Manch, 22, based in Malviya Nagar. Happy to send a self-tape.", "new", ago(0, 9)),
      e("Neha Purohit", "neha@example.com", "Short or branded film", "January",
        "We run a small handloom label in Sanganer and want a 90-second film about our block printers. Budget is flexible.", "replied", ago(2), "Call on Friday. Sent the rate card."),
      e("Kabir Mehta", "kabir.m@example.com", "Music or score", "Before March",
        "Looking for a 4-minute original score for a college short. Tabla and drone, something like your damru motif.", "new", ago(3, 5)),
      e("Pooja Rathore", "pooja.r@example.com", "Edit and colour", "Two weeks",
        "Have 40 minutes of documentary footage from Pushkar mela. Need an edit and a grade.", "done", ago(9), "Delivered. Paid in full."),
      e("Arjun Singh", "arjun.s@example.com", "A role in AHAM (cast or crew)", null,
        "I'd like to be considered for sound recordist in AHAM.\n\nAbout me: own a Zoom F3 and a shotgun mic, free on Sundays.", "replied", ago(12)),
      e("SEO Growth Pro", "offers@example.net", "Something else", null,
        "Get your website to page 1 of Google in 7 days!!! Click here for a free audit.", "spam", ago(5))
    ];
    const replies = [{
      id: id(), created_at: ago(1, 20), enquiry_id: enquiries[2].id, subject: "Re: Short or branded film | Shunyaakar",
      body: "Hi Neha,\n\nThis sounds lovely. Block printers at work is exactly the kind of story I like to shoot. Can we talk on Friday?\n\nMayank"
    }];
    const people = ["film.fan", "reader", "cinema.jaipur", "tanvi.writes", "rohit.frames", "meera.music", "dev.edits", "ananya.k", "skit.films", "rahul.p", "sana.photos", "karan.v"];
    const subscribers = people.map((p, i) => ({
      id: id(), email: `${p}@example.com`, status: i === 4 || i === 9 ? "unsubscribed" : "subscribed",
      source: i === 7 ? "desk" : "footer", created_at: ago(40 - i * 3), unsubscribed_at: i === 4 || i === 9 ? ago(4) : null
    }));
    const letters = [
      { id: id(), created_at: ago(1), updated_at: ago(0, 3), subject: "Storyboards, week one", sent_to: 0, status: "draft", sent_at: null,
        body: "Hi,\n\nThis week I started drawing the storyboards for AHAM, beginning with the railway crossing.\n\nMayank" },
      { id: id(), created_at: ago(7), updated_at: ago(6), sent_at: ago(6), subject: "The script is locked", sent_to: 9, status: "sent",
        body: "Hi,\n\nThe final draft of **AHAM** is done: 23 pages, three chapters.\n\n# What's next\n\nTwenty-nine scenes mapped to real places around Jaipur, and seven Sundays to shoot them.\n\nMayank" },
      { id: id(), created_at: ago(22), updated_at: ago(21), sent_at: ago(21), subject: "Letter one: starting at zero", sent_to: 6, status: "sent",
        body: "Hi,\n\nThis is the first letter from the set. Not too often, I promise.\n\nMayank" }
    ];
    return { enquiries, replies, subscribers, letters };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(STORE)); } catch { db = null; }
  if (!db || !db.enquiries || !db.letters.every(l => l.updated_at)) db = seed(); // older demo data: start over
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(db)); } catch { /* private mode */ } };
  save();

  const session = () => ({ access_token: "demo", refresh_token: "demo", expires_at: Math.floor(Date.now() / 1000) + 3650 * 86400, email: EMAIL, demo: true });
  const need = (v, msg) => { if (!v) throw fail(400, msg); return v; };
  const letterIn = b => {
    const subject = String(b.subject || "").trim(), body = String(b.body || "").trim();
    if (!subject || !body) throw fail(400, "A letter needs a subject and some words.");
    return { subject, body };
  };
  const strip = s => { const { token, ...rest } = s; return rest; };

  async function preview(subject, body) {
    const site = location.origin;
    try {
      const { letterEmail } = await import("/netlify/lib/mail.mjs");
      return letterEmail({ subject, body, site, unsubUrl: `${site}/unsubscribe` });
    } catch {
      const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      return { html: `<body style="margin:0;background:#F3EDE1;color:#0E0A1C;font:16px/1.6 sans-serif;padding:32px"><h1>${esc(subject)}</h1><div style="white-space:pre-wrap">${esc(body)}</div></body>`, text: `${subject}\n\n${body}` };
    }
  }
  const byUpdated = (a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);

  const actions = {
    overview: () => ({
      enquiries: [...db.enquiries].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      replies: db.replies, subscribers: db.subscribers.map(strip),
      letters: [...db.letters].sort(byUpdated),
      me: EMAIL, mail: { ready: false, live: false, from: FROM, notify: EMAIL } // like the real setup: sending from Gmail
    }),
    "enquiry.update"(b) {
      const e = need(db.enquiries.find(x => x.id === b.id), "Which enquiry?");
      if (b.status !== undefined) { e.status = b.status; if (b.status === "replied") e.replied_at = new Date().toISOString(); }
      if (b.notes !== undefined) e.notes = String(b.notes).trim() || null;
      return { enquiry: e };
    },
    "enquiry.delete"(b) { db.enquiries = db.enquiries.filter(x => x.id !== b.id); db.replies = db.replies.filter(r => r.enquiry_id !== b.id); return {}; },
    "enquiry.reply"(b) {
      const e = need(db.enquiries.find(x => x.id === b.id), "Which enquiry?");
      const { subject, body } = letterIn(b);
      const reply = { id: id(), created_at: new Date().toISOString(), enquiry_id: e.id, subject, body };
      db.replies.push(reply); e.status = "replied"; e.replied_at = reply.created_at;
      return { reply, enquiry: e };
    },
    "subscriber.add"(b) {
      const email = String(b.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw fail(400, "That email doesn't look right.");
      let s = db.subscribers.find(x => x.email === email);
      if (s) Object.assign(s, { status: "subscribed", unsubscribed_at: null });
      else { s = { id: id(), email, status: "subscribed", source: "desk", created_at: new Date().toISOString(), unsubscribed_at: null }; db.subscribers.unshift(s); }
      return { subscriber: strip(s) };
    },
    "subscriber.update"(b) {
      const s = need(db.subscribers.find(x => x.id === b.id), "Which subscriber?");
      Object.assign(s, { status: b.status, unsubscribed_at: b.status === "unsubscribed" ? new Date().toISOString() : null });
      return { subscriber: strip(s) };
    },
    "subscriber.delete"(b) { db.subscribers = db.subscribers.filter(x => x.id !== b.id); return {}; },
    async "letter.preview"(b) { const { subject, body } = letterIn(b); const m = await preview(subject, body); return { html: m.html, text: m.text }; },
    "letter.save"(b) {
      const { subject, body } = letterIn(b), now = new Date().toISOString();
      let l = b.id && db.letters.find(x => x.id === b.id && x.status === "draft");
      if (l) Object.assign(l, { subject, body, updated_at: now });
      else { l = { id: id(), created_at: now, updated_at: now, subject, body, status: "draft", sent_at: null, sent_to: 0 }; db.letters.push(l); }
      return { letter: l };
    },
    "letter.mark_sent"(b) {
      const l = need(db.letters.find(x => x.id === b.id), "Save the letter first.");
      const now = new Date().toISOString();
      Object.assign(l, { status: "sent", sent_at: now, updated_at: now, sent_to: db.subscribers.filter(s => s.status === "subscribed").length });
      return { letter: l };
    },
    "letter.delete"(b) { db.letters = db.letters.filter(x => x.id !== b.id); return {}; },
    "letter.test"(b) { letterIn(b); return { to: `${EMAIL} (demo: nothing was sent)` }; },
    "letter.send"(b) {
      const { subject, body } = letterIn(b);
      const n = db.subscribers.filter(s => s.status === "subscribed").length;
      if (Number(b.expect) !== n) throw fail(409, `The list changed while you were writing: it's ${n} people now.`);
      const now = new Date().toISOString();
      const letter = { id: id(), created_at: now, updated_at: now, sent_at: now, subject, body, sent_to: n, status: "sent" };
      db.letters.push(letter);
      return { letter };
    }
  };

  async function call(body, token) {
    await wait(220);
    const a = String(body.action || "");
    if (a === "login") {
      if (String(body.email || "").trim().toLowerCase() === EMAIL && body.password === PASSWORD) return { ok: true, session: session() };
      throw fail(401, "That email and password don't match.");
    }
    if (a === "refresh") return { ok: true, session: session() };
    if (token !== "demo") throw fail(401, "Sign in first.");
    if (!Object.hasOwn(actions, a)) throw fail(400, "Unknown action.");
    const out = await actions[a](body);
    save();
    return JSON.parse(JSON.stringify({ ok: true, ...out })); // a copy, like a real server response
  }

  function reset() { db = seed(); save(); }

  return { call, reset, EMAIL, PASSWORD };
})();
