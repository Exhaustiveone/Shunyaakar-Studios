/* =====================================================================
   SHUNYAAKAR — STUDIO DESK
   The private back room: enquiries from "Work with us" and the
   "Letters from the set" list. Talks only to /api/desk.
   ===================================================================== */
(() => {
  "use strict";

  const API = "/api/desk";
  const KEY = "shunyaakar-desk";
  const DRAFT = "shunyaakar-desk-draft";
  const TZ = "Asia/Kolkata";
  const STATUS = {
    new: { label: "New", verb: "New" },
    replied: { label: "Replied", verb: "Replied" },
    done: { label: "Done", verb: "Done" },
    spam: { label: "Spam", verb: "Spam" }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const local = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
  };

  const st = {
    session: local.get(KEY),
    data: null,
    view: "enquiries",
    filter: "all",
    q: "",
    subQ: "",
    sel: null,
    replies: {},                                   // unsent reply drafts per enquiry
    draft: local.get(DRAFT) || { subject: "", body: "" },
    demo: false                                    // true when the backend isn't set up: sample data, see demo.js
  };

  /* ---------------- time ---------------- */
  const fmtDate = iso => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  const fmtFull = iso => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ });
  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
    return fmtDate(iso);
  }

  /* ---------------- toast ---------------- */
  let toastT;
  function toast(msg, tone = "") {
    const t = $("#toast");
    t.textContent = msg; t.className = `toast is-on ${tone}`;
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = "toast"; }, 4200);
  }

  /* ---------------- API ---------------- */
  async function post(body, token) {
    if (st.demo) return window.DeskDemo.call(body, token);
    let r;
    try {
      r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
    } catch {
      throw Object.assign(new Error("No connection. Check your internet and try again."), { status: 0 });
    }
    const d = await r.json().catch(() => null);
    if (r.ok && d && d.ok) return d;
    const msg = (d && d.error) || (r.status === 404
      ? "The desk's server isn't running here. It works on the live Netlify site, or locally with `netlify dev`."
      : `Something went wrong (${r.status}).`);
    throw Object.assign(new Error(msg), { status: r.status });
  }

  async function freshToken() {
    const s = st.session;
    if (!s) return null;
    if (s.expires_at * 1000 - Date.now() > 90e3) return s.access_token;
    const d = await post({ action: "refresh", refresh_token: s.refresh_token });
    st.session = d.session; local.set(KEY, d.session);
    return d.session.access_token;
  }

  async function api(action, payload = {}) {
    try {
      return await post({ action, ...payload }, await freshToken());
    } catch (e) {
      if (e.status === 401 || e.status === 403) { signOut(e.message); }
      throw e;
    }
  }

  /* ---------------- sign in / out ---------------- */
  function renderLogin(msg = "") {
    document.title = "Studio desk | Shunyaakar";
    app.className = "app app-login";
    app.innerHTML = `
      <form class="login" id="login" novalidate>
        <p class="mark">SHUNYAAKAR</p>
        <h1>Studio desk</h1>
        <p class="login-sub">Enquiries and letters. Only for the studio.</p>
        ${st.demo ? `<div class="demo-note">
          <p><b>Demo mode.</b> The backend isn't connected here yet, so the desk runs on sample data in this browser. Nothing is sent or saved online.</p>
          <p>Email <code>${esc(window.DeskDemo.EMAIL)}</code><br>Password <code>${esc(window.DeskDemo.PASSWORD)}</code></p>
          <button class="btn btn-small btn-ghost" type="button" data-act="demo-fill">Fill it in for me</button>
        </div>` : ""}
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
        <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <p class="login-err" role="alert">${esc(msg)}</p>
        <button class="btn btn-marigold" type="submit">Open the desk</button>
        <a class="login-back" href="/">Back to the site</a>
      </form>`;
    const f = $("#login");
    $("input", f).focus();
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(f), btn = $("button", f), err = $(".login-err", f);
      if (!fd.get("email") || !fd.get("password")) { err.textContent = "Add your email and password."; return; }
      btn.disabled = true; btn.textContent = "Opening"; err.textContent = "";
      try {
        const d = await post({ action: "login", email: fd.get("email"), password: fd.get("password") });
        st.session = d.session; local.set(KEY, d.session);
        await load(true);
      } catch (x) {
        err.textContent = x.message; btn.disabled = false; btn.textContent = "Open the desk";
      }
    });
  }

  function signOut(msg) {
    st.session = null; st.data = null; local.set(KEY, null);
    renderLogin(msg);
  }

  /* ---------------- data ---------------- */
  async function load(first) {
    try {
      st.data = await api("overview");
    } catch (e) {
      if (!st.session) return; // already sent to the login screen
      if (first || !st.data) { app.className = "app"; app.innerHTML = `<div class="fail"><h1>The desk couldn't open</h1><p>${esc(e.message)}</p><button class="btn" data-act="reload">Try again</button> <button class="btn btn-ghost" data-act="signout">Sign out</button></div>`; }
      else toast(e.message, "bad");
      return;
    }
    const m = location.hash.match(/^#e-([0-9a-f-]{36})$/i);
    if (first && m && st.data.enquiries.some(e => e.id === m[1])) { st.view = "enquiries"; st.sel = m[1]; st.filter = "all"; }
    renderApp();
  }

  const byId = id => st.data.enquiries.find(e => e.id === id);
  const counts = () => {
    const c = { all: 0, new: 0, replied: 0, done: 0, spam: 0 };
    st.data.enquiries.forEach(e => { c[e.status] = (c[e.status] || 0) + 1; if (e.status !== "spam") c.all++; });
    return c;
  };
  const activeSubs = () => st.data.subscribers.filter(s => s.status === "subscribed");

  /* ---------------- shell ---------------- */
  function renderApp() {
    const c = counts(), mail = st.data.mail;
    document.title = `${c.new ? `(${c.new}) ` : ""}Studio desk | Shunyaakar`;
    app.className = `app view-${st.view}${st.sel && st.view === "enquiries" ? " has-sel" : ""}`;
    app.innerHTML = `
      <header class="top">
        <a class="mark" href="/" title="Back to the site">SHUNYAAKAR <span>desk</span></a>
        <nav class="tabs" aria-label="Desk">
          <button class="tab${st.view === "enquiries" ? " is-on" : ""}" data-act="view" data-view="enquiries" aria-current="${st.view === "enquiries" ? "page" : "false"}">Enquiries${c.new ? `<b class="pill">${c.new}</b>` : ""}</button>
          <button class="tab${st.view === "letters" ? " is-on" : ""}" data-act="view" data-view="letters" aria-current="${st.view === "letters" ? "page" : "false"}">Letters<b class="pill pill-quiet">${activeSubs().length}</b></button>
        </nav>
        <div class="top-end">
          <button class="icon-btn" data-act="refresh" title="Refresh" aria-label="Refresh">↻</button>
          <button class="link-btn" data-act="signout">Sign out</button>
        </div>
      </header>
      ${st.demo ? `<p class="banner banner-warn"><b>Demo mode:</b> sample data kept in this browser. Nothing is sent or saved online. <button class="link-btn" data-act="demo-reset">Reset sample data</button></p>`
        : mail.ready && !mail.live ? `<p class="banner">Setup mode: new enquiries are emailed to <b>${esc(mail.notify || "you")}</b>. Replying and sending letters from here switch on once your domain is verified.</p>` : ""}
      <div class="view" id="view"></div>`;
    st.view === "enquiries" ? renderEnquiries() : renderLetters();
  }

  /* ---------------- enquiries ---------------- */
  function filtered() {
    const q = st.q.trim().toLowerCase();
    return st.data.enquiries.filter(e =>
      (st.filter === "all" ? e.status !== "spam" : e.status === st.filter) &&
      (!q || [e.name, e.email, e.project, e.message, e.notes, e.timeline].some(v => (v || "").toLowerCase().includes(q))));
  }

  function renderEnquiries() {
    const c = counts();
    $("#view").innerHTML = `
      <div class="enq-layout">
        <section class="enq-side" aria-label="Enquiries">
          <div class="toolbar">
            <div class="chips" role="group" aria-label="Filter">
              ${["all", "new", "replied", "done", "spam"].map(f => `<button class="chip${st.filter === f ? " is-on" : ""} f-${f}" data-act="filter" data-filter="${f}" aria-pressed="${st.filter === f}">${f === "all" ? "All" : STATUS[f].label}<span>${c[f]}</span></button>`).join("")}
            </div>
            <div class="search-row">
              <input class="search" id="enqSearch" type="search" placeholder="Search name, email, message" value="${esc(st.q)}" aria-label="Search enquiries">
              <button class="btn btn-small btn-ghost" data-act="export-enq" title="Download as a spreadsheet (CSV)">Export</button>
            </div>
          </div>
          <div class="enq-list" id="enqList"></div>
        </section>
        <section class="enq-detail" id="enqDetail" aria-label="Enquiry"></section>
      </div>`;
    renderEnqList(); renderEnqDetail();
    $("#enqSearch").addEventListener("input", e => { st.q = e.target.value; renderEnqList(); });
  }

  function renderEnqList() {
    const list = filtered();
    $("#enqList").innerHTML = list.length ? list.map(e => `
      <button class="enq${st.sel === e.id ? " is-sel" : ""}" data-act="open" data-id="${e.id}">
        <span class="enq-top"><i class="dot s-${e.status}" title="${STATUS[e.status].label}"></i><b>${esc(e.name)}</b><time datetime="${e.created_at}">${ago(e.created_at)}</time></span>
        <span class="enq-proj">${esc(e.project || "Something else")}</span>
        <span class="enq-msg">${esc(e.message)}</span>
      </button>`).join("")
      : `<p class="empty">${st.data.enquiries.length ? "Nothing here." : "No enquiries yet. When someone writes through <b>Work with us</b>, it lands here."}</p>`;
  }

  function mailtoFor(e, d) {
    return `mailto:${encodeURIComponent(e.email)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(`${d.body}\n\n> ${e.name} wrote:\n> ${e.message.replace(/\n/g, "\n> ")}`.slice(0, 1800))}`;
  }

  function renderEnqDetail() {
    const box = $("#enqDetail"), e = st.sel && byId(st.sel);
    if (!e) {
      box.innerHTML = `<div class="detail-empty"><p class="hand">Pick an enquiry</p><p>Everyone who writes through the site shows up on the left, newest first.</p></div>`;
      return;
    }
    const live = st.data.mail.live;
    const first = e.name.split(/\s+/)[0];
    const d = st.replies[e.id] || (st.replies[e.id] = { subject: `Re: ${e.project || "your message"} | Shunyaakar`, body: `Hi ${first},\n\n` });
    const sent = st.data.replies.filter(r => r.enquiry_id === e.id);
    box.innerHTML = `
      <button class="back" data-act="back">← All enquiries</button>
      <header class="d-head">
        <p class="d-status s-${e.status}">${STATUS[e.status].label}</p>
        <h1 class="d-name">${esc(e.name)}</h1>
        <p class="d-email"><a href="mailto:${esc(e.email)}">${esc(e.email)}</a><button class="link-btn" data-act="copy" data-text="${esc(e.email)}">Copy</button></p>
      </header>
      <dl class="d-meta">
        <div><dt>Making</dt><dd>${esc(e.project || "Something else")}</dd></div>
        <div><dt>When</dt><dd>${esc(e.timeline || "Not said")}</dd></div>
        <div><dt>Received</dt><dd>${fmtFull(e.created_at)}</dd></div>
      </dl>
      <div class="d-msg">${esc(e.message)}</div>

      <div class="d-set" role="group" aria-label="Mark as">
        ${Object.keys(STATUS).map(s => `<button class="seg s-${s}${e.status === s ? " is-on" : ""}" data-act="status" data-status="${s}" aria-pressed="${e.status === s}">${STATUS[s].verb}</button>`).join("")}
      </div>

      <label class="field"><span>Private notes <em id="notesState"></em></span>
        <textarea id="notes" rows="3" placeholder="Budget, call on Friday, sent rate card…">${esc(e.notes || "")}</textarea></label>

      <section class="reply">
        <h2 class="h-small">Reply</h2>
        <label class="field"><span>Subject</span><input id="rSubject" value="${esc(d.subject)}"></label>
        <label class="field"><span>Message</span><textarea id="rBody" rows="8">${esc(d.body)}</textarea></label>
        <div class="row">
          ${live ? `<button class="btn btn-marigold" data-act="reply">Send reply</button>` : ""}
          <a class="btn ${live ? "btn-ghost" : "btn-marigold"}" id="mailto" href="${esc(mailtoFor(e, d))}">Open in email app</a>
        </div>
        ${live ? `<p class="hint">Sent from ${esc(st.data.mail.from)}. Their answer comes back to your inbox.</p>`
          : `<p class="hint">Drafts it in Gmail or Mail with their message quoted. After sending, mark it <b>Replied</b>.</p>`}
      </section>

      ${sent.length ? `<section class="history"><h2 class="h-small">Sent from the desk</h2>${sent.map(r => `
        <article class="sent-reply"><p class="sent-meta">${fmtFull(r.created_at)} · ${esc(r.subject)}</p><div>${esc(r.body)}</div></article>`).join("")}</section>` : ""}

      <p class="d-foot"><button class="link-btn danger" data-act="delete">Delete this enquiry</button></p>`;

    const notes = $("#notes"); let nt;
    notes.addEventListener("input", () => { clearTimeout(nt); $("#notesState").textContent = ""; nt = setTimeout(() => saveNotes(e.id, notes.value), 900); });
    notes.addEventListener("blur", () => { clearTimeout(nt); if ((byId(e.id).notes || "") !== notes.value.trim()) saveNotes(e.id, notes.value); });
    const sync = () => { d.subject = $("#rSubject").value; d.body = $("#rBody").value; $("#mailto").href = mailtoFor(e, d); };
    $("#rSubject").addEventListener("input", sync);
    $("#rBody").addEventListener("input", sync);
  }

  function replaceEnquiry(row) {
    const i = st.data.enquiries.findIndex(x => x.id === row.id);
    if (i > -1) st.data.enquiries[i] = row;
  }

  async function saveNotes(id, value) {
    const s = $("#notesState");
    try {
      const d = await api("enquiry.update", { id, notes: value });
      replaceEnquiry(d.enquiry);
      if (s && st.sel === id) s.textContent = "Saved";
    } catch (e) { toast(e.message, "bad"); }
  }

  async function setStatus(status) {
    const id = st.sel;
    try {
      const d = await api("enquiry.update", { id, status });
      replaceEnquiry(d.enquiry);
      renderApp();
      toast(`Marked ${STATUS[status].label.toLowerCase()}.`);
    } catch (e) { toast(e.message, "bad"); }
  }

  /* ---------------- letters ---------------- */
  const GMAIL_LIMIT = 450; // personal Gmail allows about 500 recipients a day
  const drafts = () => st.data.letters.filter(l => l.status === "draft");
  const sentLetters = () => st.data.letters.filter(l => l.status !== "draft");

  function renderLetters() {
    const subs = st.data.subscribers, active = activeSubs(), left = subs.length - active.length, mail = st.data.mail;
    const n = active.length, people = `${n} ${n === 1 ? "person" : "people"}`;
    $("#view").innerHTML = `
      <div class="tiles">
        <div class="tile t-marigold"><b>${n}</b><span>on the list</span></div>
        <div class="tile t-peacock"><b>${sentLetters().length}</b><span>letters sent</span></div>
        <div class="tile t-quiet"><b>${left}</b><span>left the list</span></div>
      </div>

      <div class="letters-grid">
        <section class="composer" aria-label="Write a letter">
          <div class="composer-head">
            <h1 class="h-mid">${st.draft.id ? "Edit draft" : "Write a letter"}</h1>
            ${st.draft.id || st.draft.subject || st.draft.body ? `<button class="link-btn" data-act="new-letter">Start a new one</button>` : ""}
          </div>
          <label class="field"><span>Subject <em id="saveState">${st.draft.id ? "Draft saved" : ""}</em></span><input id="lSubject" maxlength="200" value="${esc(st.draft.subject)}" placeholder="Day one on set"></label>
          <label class="field"><span>Letter</span><textarea id="lBody" rows="14" placeholder="Write it the way you'd tell a friend.">${esc(st.draft.body)}</textarea></label>
          <details class="howto"><summary>Formatting</summary>
            <ul>
              <li>Leave a blank line for a new paragraph</li>
              <li><code># Heading</code> on its own line</li>
              <li><code>**bold words**</code></li>
              <li><code>[link text](https://…)</code></li>
              <li><code>![caption](https://…/still.jpg)</code> for a photo already online</li>
            </ul>
          </details>
          <div class="row">
            <button class="btn btn-ghost" data-act="preview">Preview</button>
            <button class="btn btn-ghost" data-act="save-letter">Save draft</button>
          </div>

          <div class="send-steps">
            <h2 class="h-small">Send it from your Gmail</h2>
            <ol>
              <li><button class="btn btn-small" data-act="copy-letter">Copy the letter</button><span>Copies it with the design, ready to paste into the message.</span></li>
              <li><button class="btn btn-small" data-act="copy-emails"${n ? "" : " disabled"}>Copy ${n} email${n === 1 ? "" : "s"}</button><span>Paste them into <b>Bcc</b>, so nobody sees anyone else's email.</span></li>
              <li><button class="btn btn-small" data-act="open-gmail">Open Gmail</button><span>Subject is filled in. Paste the emails and the letter, then send.</span></li>
              <li><button class="btn btn-small btn-marigold" data-act="mark-sent"${n ? "" : " disabled"}>Mark as sent</button><span>Files it under Sent, so you know what went out and when.</span></li>
            </ol>
            ${n > GMAIL_LIMIT ? `<p class="hint">Gmail lets a personal account email about 500 people a day. Send to the list in parts on different days, or set up automatic sending (BACKEND.md).</p>` : ""}
            <p class="hint">Every letter ends with a link to <b>/unsubscribe</b>, where readers can take themselves off the list.</p>
          </div>

          ${mail.ready ? `<div class="send-steps">
            <h2 class="h-small">Or send automatically</h2>
            <div class="row">
              <button class="btn btn-ghost btn-small" data-act="test">Send a test to me</button>
              <button class="btn btn-marigold btn-small" data-act="send"${mail.live && n ? "" : " disabled"}>Send to ${people}</button>
            </div>
            <p class="hint">${mail.live ? `Goes out from ${esc(mail.from)}, each with its own one-click unsubscribe link.` : "Switches on once your domain is verified in Resend."}</p>
          </div>` : ""}
        </section>
        <section class="preview" aria-label="Preview">
          <h2 class="h-small">Preview</h2>
          <iframe id="pv" sandbox title="Letter preview"></iframe>
          <p class="hint" id="pvHint">Press Preview to see it as it will land in an inbox.</p>
        </section>
      </div>

      ${drafts().length ? `<section class="sent-letters" aria-label="Drafts"><h2 class="h-mid">Drafts</h2>
        ${drafts().map(l => `<article class="sent-letter${st.draft.id === l.id ? " is-open" : ""}"><div><p class="sent-meta">Edited ${ago(l.updated_at || l.created_at)}</p><h3>${esc(l.subject)}</h3></div>
          <div class="row"><button class="link-btn" data-act="open-letter" data-id="${l.id}">${st.draft.id === l.id ? "Open now" : "Open"}</button><button class="link-btn danger" data-act="delete-letter" data-id="${l.id}">Delete</button></div></article>`).join("")}</section>` : ""}

      <section class="subs" aria-label="Subscribers">
        <div class="subs-head">
          <h2 class="h-mid">The list</h2>
          <input class="search" id="subSearch" type="search" placeholder="Search emails" value="${esc(st.subQ)}" aria-label="Search subscribers">
          <form class="add-sub" id="addSub"><input name="email" type="email" placeholder="Add someone by email" aria-label="Email to add" required><button class="btn btn-small">Add</button></form>
          <button class="btn btn-small btn-ghost" data-act="export-subs">Export</button>
        </div>
        <div class="table-wrap"><table class="subs-table"><thead><tr><th>Email</th><th>Joined</th><th>From</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="subRows"></tbody></table></div>
      </section>

      ${sentLetters().length ? `<section class="sent-letters" aria-label="Sent letters"><h2 class="h-mid">Sent</h2>
        ${sentLetters().map(l => `<article class="sent-letter"><div><p class="sent-meta">${fmtFull(l.sent_at || l.created_at)} · to ${l.sent_to}${l.status === "partial" ? " (stopped early)" : ""}</p><h3>${esc(l.subject)}</h3></div>
          <button class="link-btn" data-act="reuse" data-id="${l.id}">Copy into the editor</button></article>`).join("")}</section>` : ""}`;

    renderSubRows();
    let saveT;
    const edit = () => {
      st.draft = { ...st.draft, subject: $("#lSubject").value, body: $("#lBody").value };
      local.set(DRAFT, st.draft);
      $("#saveState").textContent = "";
      clearTimeout(saveT); saveT = setTimeout(() => saveLetter(true), 2000); // quiet autosave to the database
    };
    $("#lSubject").addEventListener("input", edit);
    $("#lBody").addEventListener("input", edit);
    $("#subSearch").addEventListener("input", e => { st.subQ = e.target.value; renderSubRows(); });
    $("#addSub").addEventListener("submit", async e => {
      e.preventDefault();
      const input = $("input", e.target);
      try {
        const d = await api("subscriber.add", { email: input.value });
        st.data.subscribers = [d.subscriber, ...st.data.subscribers.filter(s => s.id !== d.subscriber.id)];
        toast(`${d.subscriber.email} is on the list.`);
        renderApp();
      } catch (x) { toast(x.message, "bad"); }
    });
  }

  function upsertLetter(l) {
    st.data.letters = [l, ...st.data.letters.filter(x => x.id !== l.id)];
  }

  // Saves the editor to the letters table as a draft. Quiet = autosave (no toast, no re-render).
  let saving = null;
  async function saveLetter(quiet) {
    const { id, subject, body } = st.draft;
    if (!subject.trim() || !body.trim()) { if (!quiet) toast("Add a subject and some words first."); return null; }
    if (saving) await saving.catch(() => {});
    saving = api("letter.save", { id: st.draft.id || id || null, subject, body });
    try {
      const d = await saving;
      // attach the id only if the editor still holds this letter (it may have been cleared meanwhile)
      if ((st.draft.subject || st.draft.body) && (!st.draft.id || st.draft.id === d.letter.id)) st.draft = { ...st.draft, id: d.letter.id };
      local.set(DRAFT, st.draft); upsertLetter(d.letter);
      const el = $("#saveState"); if (el) el.textContent = "Draft saved";
      if (!quiet) { renderApp(); toast("Draft saved."); } // autosave never redraws: it would move buttons mid-click
      return d.letter;
    } catch (e) { if (!quiet) toast(e.message, "bad"); return null; }
    finally { saving = null; }
  }

  // Copy fallback for browsers that block the Clipboard API: select hidden content and copy it.
  function legacyCopy(html, text) {
    const el = document.createElement("div");
    el.contentEditable = "true";
    el.style.cssText = "position:fixed;left:-9999px;top:0;white-space:pre-wrap";
    if (html) el.innerHTML = html; else el.textContent = text;
    document.body.append(el);
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    sel.removeAllRanges(); el.remove();
    return ok;
  }

  // The body of the finished email, for pasting into Gmail (the hidden preview text is dropped).
  function pasteable(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pre = doc.body.firstElementChild;
    if (pre && pre.tagName === "DIV" && /display:\s*none/.test(pre.getAttribute("style") || "")) pre.remove();
    return doc.body.innerHTML;
  }

  function renderSubRows() {
    const q = st.subQ.trim().toLowerCase();
    const rows = st.data.subscribers.filter(s => !q || s.email.includes(q));
    $("#subRows").innerHTML = rows.length ? rows.map(s => `
      <tr class="${s.status}">
        <td class="em">${esc(s.email)}</td>
        <td>${fmtDate(s.created_at)}</td>
        <td>${esc(s.source || "site")}</td>
        <td><span class="tag ${s.status}">${s.status === "subscribed" ? "On the list" : "Left"}</span></td>
        <td class="acts">
          <button class="link-btn" data-act="sub-toggle" data-id="${s.id}">${s.status === "subscribed" ? "Remove" : "Add back"}</button>
          <button class="link-btn danger" data-act="sub-delete" data-id="${s.id}" aria-label="Delete ${esc(s.email)} for good">Delete</button>
        </td>
      </tr>`).join("")
      : `<tr><td colspan="5" class="empty">${st.data.subscribers.length ? "No match." : "No one yet. Sign-ups from the footer land here."}</td></tr>`;
  }

  async function previewLetter() {
    const { subject, body } = st.draft;
    if (!subject.trim() || !body.trim()) { toast("Add a subject and some words first."); return; }
    try {
      const d = await api("letter.preview", { subject, body });
      $("#pv").srcdoc = d.html;
      $("#pvHint").textContent = "This is how it looks in an inbox. Links are switched off in the preview.";
    } catch (e) { toast(e.message, "bad"); }
  }

  /* ---------------- CSV ---------------- */
  function csv(rows, cols) {
    // A leading = + - @ would be run as a formula by Excel/Sheets, so it's quoted out.
    const cell = v => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    return [cols.map(c => cell(c[0])).join(","), ...rows.map(r => cols.map(c => cell(c[1](r))).join(","))].join("\r\n");
  }
  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  /* ---------------- actions ---------------- */
  const acts = {
    view(b) {
      st.view = b.dataset.view;
      history.replaceState(null, "", st.view === "enquiries" && st.sel ? `#e-${st.sel}` : location.pathname);
      renderApp(); window.scrollTo(0, 0);
    },
    refresh() { load(false).then(() => toast("Up to date.")); },
    reload() { load(true); },
    signout() { signOut(""); },
    "demo-fill"() {
      const f = $("#login");
      f.email.value = window.DeskDemo.EMAIL; f.password.value = window.DeskDemo.PASSWORD;
      f.requestSubmit();
    },
    "demo-reset"() {
      if (!confirm("Put the sample data back the way it started?")) return;
      window.DeskDemo.reset(); st.sel = null; st.draft = { subject: "", body: "" }; local.set(DRAFT, null);
      history.replaceState(null, "", location.pathname); load(false);
    },
    filter(b) { st.filter = b.dataset.filter; renderEnquiries(); },
    open(b) {
      st.sel = b.dataset.id;
      history.replaceState(null, "", `#e-${st.sel}`);
      app.classList.add("has-sel");
      renderEnqList(); renderEnqDetail();
      if (matchMedia("(max-width: 899px)").matches) window.scrollTo(0, 0);
    },
    back() {
      st.sel = null; history.replaceState(null, "", location.pathname);
      app.classList.remove("has-sel"); renderEnqList(); renderEnqDetail();
    },
    status(b) { setStatus(b.dataset.status); },
    async copy(b) {
      try { await navigator.clipboard.writeText(b.dataset.text); toast("Copied."); }
      catch { toast(legacyCopy(null, b.dataset.text) ? "Copied." : b.dataset.text); }
    },
    async reply(b) {
      const e = byId(st.sel), d = st.replies[e.id];
      if (!d.body.replace(`Hi ${e.name.split(/\s+/)[0]},`, "").trim()) { toast("Write the reply first."); return; }
      b.disabled = true; b.textContent = "Sending";
      try {
        const r = await api("enquiry.reply", { id: e.id, subject: d.subject, body: d.body });
        st.data.replies.push(r.reply); replaceEnquiry(r.enquiry); delete st.replies[e.id];
        renderApp(); toast(`Reply sent to ${e.name}.`, "good");
      } catch (x) { b.disabled = false; b.textContent = "Send reply"; toast(x.message, "bad"); }
    },
    async delete() {
      const e = byId(st.sel);
      if (!confirm(`Delete the enquiry from ${e.name} for good? This can't be undone.`)) return;
      try {
        await api("enquiry.delete", { id: e.id });
        st.data.enquiries = st.data.enquiries.filter(x => x.id !== e.id);
        st.sel = null; history.replaceState(null, "", location.pathname);
        renderApp(); toast("Deleted.");
      } catch (x) { toast(x.message, "bad"); }
    },
    "export-enq"() {
      download(`shunyaakar-enquiries-${stamp()}.csv`, csv(filtered(), [
        ["Received", e => fmtFull(e.created_at)], ["Name", e => e.name], ["Email", e => e.email], ["Making", e => e.project],
        ["When", e => e.timeline], ["Message", e => e.message], ["Status", e => e.status], ["Notes", e => e.notes]
      ]));
    },
    "export-subs"() {
      download(`shunyaakar-list-${stamp()}.csv`, csv(st.data.subscribers, [
        ["Email", s => s.email], ["Status", s => s.status], ["Joined", s => fmtDate(s.created_at)], ["From", s => s.source],
        ["Left", s => s.unsubscribed_at ? fmtDate(s.unsubscribed_at) : ""]
      ]));
    },
    async "sub-toggle"(b) {
      const s = st.data.subscribers.find(x => x.id === b.dataset.id);
      try {
        const d = await api("subscriber.update", { id: s.id, status: s.status === "subscribed" ? "unsubscribed" : "subscribed" });
        Object.assign(s, d.subscriber); renderApp();
      } catch (x) { toast(x.message, "bad"); }
    },
    async "sub-delete"(b) {
      const s = st.data.subscribers.find(x => x.id === b.dataset.id);
      if (!confirm(`Delete ${s.email} completely? Use this when someone asks for their data to be erased.`)) return;
      try {
        await api("subscriber.delete", { id: s.id });
        st.data.subscribers = st.data.subscribers.filter(x => x.id !== s.id); renderApp(); toast("Deleted.");
      } catch (x) { toast(x.message, "bad"); }
    },
    preview() { previewLetter(); },
    "save-letter"() { saveLetter(false); },
    "new-letter"() {
      if (!st.draft.id && (st.draft.subject || st.draft.body) && !confirm("Clear the editor? This letter was never saved.")) return;
      st.draft = { subject: "", body: "" }; local.set(DRAFT, null); renderApp(); $("#lSubject").focus();
    },
    "open-letter"(b) {
      const l = st.data.letters.find(x => x.id === b.dataset.id);
      if (!st.draft.id && (st.draft.subject || st.draft.body) && !confirm("Replace what's in the editor? It was never saved.")) return;
      st.draft = { id: l.id, subject: l.subject, body: l.body }; local.set(DRAFT, st.draft);
      renderApp(); window.scrollTo(0, 0); $("#lBody").focus();
    },
    async "delete-letter"(b) {
      const l = st.data.letters.find(x => x.id === b.dataset.id);
      if (!confirm(`Delete the draft "${l.subject}"?`)) return;
      try {
        await api("letter.delete", { id: l.id });
        st.data.letters = st.data.letters.filter(x => x.id !== l.id);
        if (st.draft.id === l.id) { st.draft = { subject: "", body: "" }; local.set(DRAFT, null); }
        renderApp(); toast("Draft deleted.");
      } catch (x) { toast(x.message, "bad"); }
    },
    async "copy-letter"() {
      const { subject, body } = st.draft;
      if (!subject.trim() || !body.trim()) { toast("Add a subject and some words first."); return; }
      const got = api("letter.preview", { subject, body });
      try {
        // ClipboardItem takes promises, so the copy still counts as part of this click in Safari.
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": got.then(d => new Blob([pasteable(d.html)], { type: "text/html" })),
          "text/plain": got.then(d => new Blob([d.text], { type: "text/plain" }))
        })]);
        toast("Letter copied. Paste it into the Gmail message.", "good");
      } catch {
        let d;
        try { d = await got; } catch (x) { toast(x.message, "bad"); return; }
        if (legacyCopy(pasteable(d.html))) toast("Letter copied. Paste it into the Gmail message.", "good");
        else toast("Couldn't copy here. Press Preview, select the letter and copy it.", "bad");
      }
      got.then(d => { $("#pv").srcdoc = d.html; }).catch(() => {});
    },
    async "copy-emails"() {
      const list = activeSubs().map(s => s.email);
      let ok = false;
      try { await navigator.clipboard.writeText(list.join(", ")); ok = true; } catch { ok = legacyCopy(null, list.join(", ")); }
      toast(ok ? `${list.length} emails copied. Paste them into Bcc.` : "Couldn't copy here. Use Export instead.", ok ? "good" : "bad");
    },
    "open-gmail"() {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(st.draft.subject || "")}`;
      window.open(url, "_blank", "noopener");
    },
    async "mark-sent"(b) {
      const n = activeSubs().length;
      if (!st.draft.subject.trim() || !st.draft.body.trim()) { toast("Add a subject and some words first."); return; }
      if (!confirm(`Did "${st.draft.subject}" go out to the list?\n\nThis files it under Sent (${n} ${n === 1 ? "person" : "people"}).`)) return;
      b.disabled = true;
      try {
        const saved = await saveLetter(true);
        if (!saved) throw new Error("Couldn't save the letter first. Try again.");
        const d = await api("letter.mark_sent", { id: saved.id });
        upsertLetter(d.letter);
        st.draft = { subject: "", body: "" }; local.set(DRAFT, null);
        renderApp(); toast("Filed under Sent.", "good");
      } catch (x) { b.disabled = false; toast(x.message, "bad"); }
    },
    async test(b) {
      const { subject, body } = st.draft;
      if (!subject.trim() || !body.trim()) { toast("Add a subject and some words first."); return; }
      b.disabled = true;
      try { const d = await api("letter.test", { subject, body }); toast(`Test sent to ${d.to}.`, "good"); }
      catch (x) { toast(x.message, "bad"); }
      b.disabled = false;
    },
    async send(b) {
      const { id, subject, body } = st.draft, n = activeSubs().length;
      if (!subject.trim() || !body.trim()) { toast("Add a subject and some words first."); return; }
      if (!confirm(`Send "${subject}" to ${n} ${n === 1 ? "person" : "people"} now?\n\nOnce it's sent it can't be pulled back.`)) return;
      b.disabled = true; b.textContent = "Sending";
      try {
        const d = await api("letter.send", { id: id || null, subject, body, expect: n });
        upsertLetter(d.letter);
        st.draft = { subject: "", body: "" }; local.set(DRAFT, null);
        renderApp(); toast(`Sent to ${d.letter.sent_to}.`, "good");
      } catch (x) { b.disabled = false; b.textContent = `Send to ${n} people`; toast(x.message, "bad"); }
    },
    reuse(b) {
      const l = st.data.letters.find(x => x.id === b.dataset.id);
      if ((st.draft.subject || st.draft.body) && !confirm("Replace what's in the editor?")) return;
      st.draft = { subject: l.subject, body: l.body }; local.set(DRAFT, st.draft); // a new draft, not the sent one
      renderApp(); $("#lSubject").focus();
    }
  };

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b || !acts[b.dataset.act]) return;
    e.preventDefault();
    acts[b.dataset.act](b);
  });

  // Catch up when coming back to the tab (new enquiries may have arrived).
  document.addEventListener("visibilitychange", () => {
    // (not on Letters: you're likely back from Gmail mid-send, and a redraw would wipe the preview)
    if (document.visibilityState === "visible" && st.session && st.data && st.view === "enquiries" && !document.activeElement.matches("input, textarea")) load(false);
  });

  /* Is the real backend here and set up? If not (Live Server, or before BACKEND.md is done),
     fall back to demo mode so the desk can still be explored. */
  async function backendReady() {
    try {
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ action: "status" }) });
      const d = await r.json();
      return !!(d && d.ok && d.ready);
    } catch { return false; }
  }
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });

  (async () => {
    if (!(await backendReady())) {
      try { await loadScript("/desk/demo.js"); st.demo = true; } catch { /* no demo: the login will explain */ }
    }
    if (st.session && !!st.session.demo !== st.demo) { st.session = null; local.set(KEY, null); }
    if (st.session) load(true); else renderLogin();
  })();
})();
