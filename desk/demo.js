/* =====================================================================
   STUDIO DESK — DEMO MODE (local preview only)
   desk.js loads this only on localhost when the backend isn't running
   (e.g. Live Server in Antigravity). It answers the desk's API calls
   from sample data kept in this browser. It never runs on the real site
   and can't reach the database.

   Demo login:  demo@shunyaakar.test  /  shunyaakar-demo
   ===================================================================== */
window.DeskDemo = (() => {
  "use strict";
  const EMAIL = "demo@shunyaakar.test";
  const PASSWORD = "shunyaakar-demo";
  const STORE = "shunyaakar-desk-demo-v2";
  const SESSION = "shunyaakar-desk-demo-session";

  const id = () => crypto.randomUUID();
  const ago = (days, hours = 0) => new Date(Date.now() - (days * 86400 + hours * 3600) * 1000).toISOString();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const local = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
  };

  function seed() {
    const e = (name, email, project, timeline, message, status, when, notes = null) =>
      ({ id: id(), created_at: when, name, email, project, timeline, message, status, notes, replied_at: status === "replied" ? when : null });
    return {
      enquiries: [
        e("Riya Sharma", "riya.sharma@example.com", "Music video", "Shooting in November",
          "Hi Mayank,\n\nI'm an independent artist releasing my first single in December. I'm looking for someone to shoot and cut the video. Something moody, mostly at night, around the old city.\n\nCould we talk this week?\n\nRiya", "new", ago(0, 2)),
        e("Aman Kumar", "aman.k@example.com", "A role in AHAM (cast or crew)", null,
          "I'd like to be considered for Veer / The Other in AHAM.\n\nAbout me: three years of theatre at Ravindra Manch, 22, based in Malviya Nagar. Happy to send a self-tape.", "new", ago(0, 9)),
        e("Neha Purohit", "neha@example.com", "Short or branded film", "January",
          "We run a small handloom label in Sanganer and want a 90-second film about our block printers. Budget is flexible.", "replied", ago(2), "Call on Friday. Sent the rate card."),
        e("Kabir Mehta", "kabir.m@example.com", "Music or score", "Before March",
          "Looking for a 4-minute original score for a college short. Tabla and drone, something like your damru motif.", "new", ago(3, 5)),
        e("Pooja Rathore", "pooja.r@example.com", "Edit and colour", "Two weeks",
          "Have 40 minutes of documentary footage from Pushkar mela. Need an edit and a grade.", "done", ago(9), "Delivered."),
        e("SEO Growth Pro", "offers@example.net", "Something else", null,
          "Get your website to page 1 of Google in 7 days!!! Click here for a free audit.", "spam", ago(5))
      ],
      subscribers: ["film.fan", "reader", "cinema.jaipur", "tanvi.writes", "rohit.frames", "meera.music", "dev.edits", "ananya.k", "skit.films"]
        .map((p, i) => ({ id: id(), email: `${p}@example.com`, created_at: ago(40 - i * 4) }))
    };
  }

  let db = local.get(STORE);
  if (!db || !Array.isArray(db.enquiries) || !Array.isArray(db.subscribers)) { db = seed(); local.set(STORE, db); }
  const save = () => local.set(STORE, db);
  const copy = v => JSON.parse(JSON.stringify(v)); // like a real server response

  async function request(method, path, body = {}) {
    await wait(200);
    const route = `${method} ${path.replace(/[0-9a-f-]{36}$/i, ":id")}`;
    const rid = (path.match(/([0-9a-f-]{36})$/i) || [])[1];

    if (route === "POST /api/auth/login") {
      if (String(body.email || "").trim().toLowerCase() !== EMAIL || body.password !== PASSWORD) throw fail(401, "That email and password don't match.");
      local.set(SESSION, true);
      return { ok: true, user: { email: EMAIL } };
    }
    if (route === "POST /api/auth/logout") { local.set(SESSION, null); return { ok: true }; }
    if (!local.get(SESSION)) throw fail(401, "Sign in to open the desk.");

    switch (route) {
      case "GET /api/auth/me":
        return { ok: true, user: { email: EMAIL } };
      case "GET /api/desk/overview":
        return copy({ ok: true, me: EMAIL,
          enquiries: [...db.enquiries].sort((a, b) => b.created_at.localeCompare(a.created_at)),
          subscribers: [...db.subscribers].sort((a, b) => b.created_at.localeCompare(a.created_at)),
          replies: db.replies || [], mail: { enabled: true, from: "Shunyaakar <demo@shunyaakar.test>" } });
      case "PATCH /api/desk/enquiries/:id": {
        const e = db.enquiries.find(x => x.id === rid);
        if (!e) throw fail(404, "That enquiry is gone.");
        if (body.status !== undefined) { e.status = body.status; if (body.status === "replied") e.replied_at = new Date().toISOString(); }
        if (body.notes !== undefined) e.notes = String(body.notes).trim() || null;
        save(); return copy({ ok: true, enquiry: e });
      }
      case "POST /api/desk/enquiries/:id/reply": {
        const e = db.enquiries.find(x => x.id === rid);
        if (!e) throw fail(404, "That enquiry is gone.");
        const reply = { id: id(), created_at: new Date().toISOString(), enquiry_id: e.id, subject: body.subject, body: body.body, sent_to: e.email };
        (db.replies ||= []).push(reply); e.status = "replied"; e.replied_at = reply.created_at;
        save(); return copy({ ok: true, reply, enquiry: e }); // demo: nothing is actually sent
      }
      case "DELETE /api/desk/enquiries/:id":
        db.enquiries = db.enquiries.filter(x => x.id !== rid); save(); return { ok: true };
      case "DELETE /api/desk/subscribers/:id":
        db.subscribers = db.subscribers.filter(x => x.id !== rid); save(); return { ok: true };
    }
    throw fail(404, "Not found.");
  }

  function reset() { db = seed(); save(); }

  return { request, reset, EMAIL, PASSWORD };
})();
