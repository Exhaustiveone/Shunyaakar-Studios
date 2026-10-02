/* =====================================================================
   SHUNYAAKAR — STUDIO DESK
   The private back room: enquiries from "Work with us" and the
   newsletter sign-ups. Sign-in and every request are checked by the
   backend against the database (admin role, session cookie). This file
   knows nothing about who the admin is.
   ===================================================================== */
(() => {
  "use strict";

  const TZ = "Asia/Kolkata";
  const STATUS = { new: "New", replied: "Replied", done: "Done", spam: "Spam" };

  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const st = { data: null, view: "enquiries", filter: "all", q: "", subQ: "", sel: null, replies: {}, demo: false };

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

  /* ---------------- API ----------------
     Same-origin requests: the session cookie (HttpOnly, SameSite=Strict) goes along
     automatically and is never readable from here. */
  async function request(method, path, body) {
    if (st.demo) return window.DeskDemo.request(method, path, body);
    let r;
    try {
      r = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw Object.assign(new Error("No connection. Check your internet and try again."), { status: 0, offline: true });
    }
    const d = await r.json().catch(() => null);
    if (r.ok && d && d.ok) return d;
    throw Object.assign(new Error((d && d.error) || `Something went wrong (${r.status}).`), { status: r.status, offline: !d });
  }

  async function api(method, path, body) {
    try { return await request(method, path, body); }
    catch (e) { if (e.status === 401) renderLogin(e.message); throw e; }
  }

  /* ---------------- sign in / out ---------------- */
  function renderLogin(msg = "") {
    st.data = null;
    document.title = "Studio desk | Shunyaakar";
    app.className = "app app-login";
    app.innerHTML = `
      <form class="login" id="login" novalidate>
        <p class="mark">SHUNYAAKAR</p>
        <h1>Studio desk</h1>
        <p class="login-sub">Enquiries and sign-ups. Only for the studio.</p>
        ${st.demo ? `<div class="demo-note">
          <p><b>Demo mode.</b> The backend isn't running here, so the desk uses sample data in this browser. This only happens on your own computer.</p>
          <p>Email <code>${esc(window.DeskDemo.EMAIL)}</code><br>Password <code>${esc(window.DeskDemo.PASSWORD)}</code></p>
          <button class="btn btn-small btn-ghost" type="button" data-act="demo-fill">Fill it in for me</button>
        </div>` : ""}
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" maxlength="254" required></label>
        <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" maxlength="1024" required></label>
        <p class="login-err" role="alert">${esc(msg)}</p>
        <button class="btn btn-marigold" type="submit">Open the desk</button>
        <a class="login-back" href="/">Back to the site</a>
      </form>`;
    const f = $("#login");
    $("input", f).focus();
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const email = f.email.value.trim(), password = f.password.value, btn = $("button[type=submit]", f), err = $(".login-err", f);
      if (!email || !password) { err.textContent = "Add your email and password."; return; }
      btn.disabled = true; btn.textContent = "Opening"; err.textContent = "";
      try {
        await request("POST", "/api/auth/login", { email, password });
        f.password.value = "";
        await load(true);
      } catch (x) {
        err.textContent = x.message; btn.disabled = false; btn.textContent = "Open the desk";
      }
    });
  }

  async function signOut() {
    try { await request("POST", "/api/auth/logout"); } catch { /* signed out locally either way */ }
    st.sel = null; history.replaceState(null, "", location.pathname);
    renderLogin("");
  }

  /* ---------------- data ---------------- */
  async function load(first) {
    try {
      st.data = await api("GET", "/api/desk/overview");
    } catch (e) {
      if (e.status === 401) return;
      if (first || !st.data) {
        app.className = "app";
        app.innerHTML = `<div class="fail"><h1>The desk couldn't open</h1><p>${esc(e.message)}</p><button class="btn" data-act="reload">Try again</button> <button class="btn btn-ghost" data-act="signout">Sign out</button></div>`;
      } else toast(e.message, "bad");
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

  /* ---------------- shell ---------------- */
  function renderApp() {
    const c = counts();
    document.title = `${c.new ? `(${c.new}) ` : ""}Studio desk | Shunyaakar`;
    app.className = `app view-${st.view}${st.sel && st.view === "enquiries" ? " has-sel" : ""}`;
    app.innerHTML = `
      <header class="top">
        <a class="mark" href="/" title="Back to the site">SHUNYAAKAR <span>desk</span></a>
        <nav class="tabs" aria-label="Desk">
          <button class="tab${st.view === "enquiries" ? " is-on" : ""}" data-act="view" data-view="enquiries" aria-current="${st.view === "enquiries" ? "page" : "false"}">Enquiries${c.new ? `<b class="pill">${c.new}</b>` : ""}</button>
          <button class="tab${st.view === "newsletter" ? " is-on" : ""}" data-act="view" data-view="newsletter" aria-current="${st.view === "newsletter" ? "page" : "false"}">Newsletter<b class="pill pill-quiet">${st.data.subscribers.length}</b></button>
        </nav>
        <div class="top-end">
          <button class="icon-btn" data-act="refresh" title="Refresh" aria-label="Refresh">↻</button>
          <button class="link-btn" data-act="signout" title="Signed in as ${esc(st.data.me)}">Sign out</button>
        </div>
      </header>
      ${st.demo ? `<p class="banner banner-warn"><b>Demo mode:</b> sample data kept in this browser, only on your own computer. <button class="link-btn" data-act="demo-reset">Reset sample data</button></p>` : ""}
      <div class="view" id="view"></div>`;
    st.view === "enquiries" ? renderEnquiries() : renderNewsletter();
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
              ${["all", "new", "replied", "done", "spam"].map(f => `<button class="chip${st.filter === f ? " is-on" : ""} f-${f}" data-act="filter" data-filter="${f}" aria-pressed="${st.filter === f}">${f === "all" ? "All" : STATUS[f]}<span>${c[f]}</span></button>`).join("")}
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
      <button class="enq${st.sel === e.id ? " is-sel" : ""}" data-act="open" data-id="${esc(e.id)}">
        <span class="enq-top"><i class="dot s-${esc(e.status)}" title="${STATUS[e.status]}"></i><b>${esc(e.name)}</b><time datetime="${esc(e.created_at)}">${ago(e.created_at)}</time></span>
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
    const first = e.name.split(/\s+/)[0];
    const d = st.replies[e.id] || (st.replies[e.id] = { subject: `Re: ${e.project || "your message"} | Shunyaakar`, body: `Hi ${first},\n\n` });
    box.innerHTML = `
      <button class="back" data-act="back">← All enquiries</button>
      <header class="d-head">
        <p class="d-status s-${esc(e.status)}">${STATUS[e.status]}</p>
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
        ${Object.keys(STATUS).map(s => `<button class="seg s-${s}${e.status === s ? " is-on" : ""}" data-act="status" data-status="${s}" aria-pressed="${e.status === s}">${STATUS[s]}</button>`).join("")}
      </div>

      <label class="field"><span>Private notes <em id="notesState"></em></span>
        <textarea id="notes" rows="3" maxlength="5000" placeholder="Budget, call on Friday, sent rate card…">${esc(e.notes || "")}</textarea></label>

      <section class="reply">
        <h2 class="h-small">Reply</h2>
        <label class="field"><span>Subject</span><input id="rSubject" maxlength="200" value="${esc(d.subject)}"></label>
        <label class="field"><span>Message</span><textarea id="rBody" rows="8">${esc(d.body)}</textarea></label>
        <div class="row"><a class="btn btn-marigold" id="mailto" href="${esc(mailtoFor(e, d))}">Open in email app</a></div>
        <p class="hint">Drafts it in Gmail or Mail with their message quoted. After sending, mark it <b>Replied</b>.</p>
      </section>

      <p class="d-foot"><button class="link-btn danger" data-act="delete">Delete this enquiry</button></p>`;

    const notes = $("#notes"); let nt;
    notes.addEventListener("input", () => { clearTimeout(nt); $("#notesState").textContent = ""; nt = setTimeout(() => saveNotes(e.id, notes.value), 900); });
    notes.addEventListener("blur", () => { clearTimeout(nt); const cur = byId(e.id); if (cur && (cur.notes || "") !== notes.value.trim()) saveNotes(e.id, notes.value); });
    const sync = () => { d.subject = $("#rSubject").value; d.body = $("#rBody").value; $("#mailto").href = mailtoFor(e, d); };
    $("#rSubject").addEventListener("input", sync);
    $("#rBody").addEventListener("input", sync);
  }

  function replaceEnquiry(row) {
    const i = st.data.enquiries.findIndex(x => x.id === row.id);
    if (i > -1) st.data.enquiries[i] = row;
  }

  const enquiryPath = id => `/api/desk/enquiries/${encodeURIComponent(id)}`;

  async function saveNotes(id, value) {
    try {
      const d = await api("PATCH", enquiryPath(id), { notes: value });
      replaceEnquiry(d.enquiry);
      const s = $("#notesState"); if (s && st.sel === id) s.textContent = "Saved";
    } catch (e) { toast(e.message, "bad"); }
  }

  async function setStatus(status) {
    try {
      const d = await api("PATCH", enquiryPath(st.sel), { status });
      replaceEnquiry(d.enquiry);
      renderApp();
      toast(`Marked ${STATUS[status].toLowerCase()}.`);
    } catch (e) { toast(e.message, "bad"); }
  }

  /* ---------------- newsletter (stored only; never sent anywhere) ---------------- */
  function renderNewsletter() {
    const subs = st.data.subscribers;
    const month = subs.filter(s => Date.now() - new Date(s.created_at) < 30 * 86400e3).length;
    $("#view").innerHTML = `
      <div class="tiles tiles-2">
        <div class="tile t-marigold"><b>${subs.length}</b><span>signed up</span></div>
        <div class="tile t-peacock"><b>${month}</b><span>in the last 30 days</span></div>
      </div>
      <section class="subs" aria-label="Newsletter sign-ups">
        <div class="subs-head">
          <h1 class="h-mid">Letters from the set</h1>
          <input class="search" id="subSearch" type="search" placeholder="Search emails" value="${esc(st.subQ)}" aria-label="Search sign-ups">
        </div>
        <p class="hint subs-note">Emails from the footer sign-up. They're kept here only. Nothing is sent to them.</p>
        <div class="table-wrap"><table class="subs-table"><thead><tr><th>Email</th><th>Signed up</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody id="subRows"></tbody></table></div>
      </section>`;
    renderSubRows();
    $("#subSearch").addEventListener("input", e => { st.subQ = e.target.value; renderSubRows(); });
  }

  function renderSubRows() {
    const q = st.subQ.trim().toLowerCase();
    const rows = st.data.subscribers.filter(s => !q || s.email.includes(q));
    $("#subRows").innerHTML = rows.length ? rows.map(s => `
      <tr>
        <td class="em">${esc(s.email)}</td>
        <td>${fmtDate(s.created_at)}</td>
        <td class="acts"><button class="link-btn danger" data-act="sub-delete" data-id="${esc(s.id)}" aria-label="Delete ${esc(s.email)}">Delete</button></td>
      </tr>`).join("")
      : `<tr><td colspan="3" class="empty">${st.data.subscribers.length ? "No match." : "No one yet. Sign-ups from the footer land here."}</td></tr>`;
  }

  /* ---------------- CSV (enquiries) ---------------- */
  function csv(rows, cols) {
    // A leading = + - @ would be run as a formula by Excel/Sheets, so it's quoted out.
    const cell = v => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    return [cols.map(c => cell(c[0])).join(","), ...rows.map(r => cols.map(c => cell(c[1](r))).join(","))].join("\r\n");
  }
  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // Copy fallback for browsers that block the Clipboard API.
  function legacyCopy(text) {
    const el = document.createElement("textarea");
    el.value = text; el.setAttribute("readonly", ""); el.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(el); el.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    el.remove();
    return ok;
  }

  /* ---------------- actions ---------------- */
  const acts = {
    view(b) {
      st.view = b.dataset.view;
      history.replaceState(null, "", st.view === "enquiries" && st.sel ? `#e-${st.sel}` : location.pathname);
      renderApp(); window.scrollTo(0, 0);
    },
    refresh() { load(false).then(() => st.data && toast("Up to date.")); },
    reload() { load(true); },
    signout() { signOut(); },
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
      catch { toast(legacyCopy(b.dataset.text) ? "Copied." : b.dataset.text); }
    },
    async delete() {
      const e = byId(st.sel);
      if (!confirm(`Delete the enquiry from ${e.name} for good? This can't be undone.`)) return;
      try {
        await api("DELETE", enquiryPath(e.id));
        st.data.enquiries = st.data.enquiries.filter(x => x.id !== e.id);
        st.sel = null; history.replaceState(null, "", location.pathname);
        renderApp(); toast("Deleted.");
      } catch (x) { toast(x.message, "bad"); }
    },
    "export-enq"() {
      download(`shunyaakar-enquiries-${new Date().toISOString().slice(0, 10)}.csv`, csv(filtered(), [
        ["Received", e => fmtFull(e.created_at)], ["Name", e => e.name], ["Email", e => e.email], ["Making", e => e.project],
        ["When", e => e.timeline], ["Message", e => e.message], ["Status", e => e.status], ["Notes", e => e.notes]
      ]));
    },
    async "sub-delete"(b) {
      const s = st.data.subscribers.find(x => x.id === b.dataset.id);
      if (!confirm(`Delete ${s.email} from the list for good?`)) return;
      try {
        await api("DELETE", `/api/desk/subscribers/${encodeURIComponent(s.id)}`);
        st.data.subscribers = st.data.subscribers.filter(x => x.id !== s.id); renderApp(); toast("Deleted.");
      } catch (x) { toast(x.message, "bad"); }
    },
    "demo-fill"() {
      const f = $("#login");
      f.email.value = window.DeskDemo.EMAIL; f.password.value = window.DeskDemo.PASSWORD;
      f.requestSubmit();
    },
    "demo-reset"() {
      if (!confirm("Put the sample data back the way it started?")) return;
      window.DeskDemo.reset(); st.sel = null;
      history.replaceState(null, "", location.pathname); load(false);
    }
  };

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b || !Object.hasOwn(acts, b.dataset.act)) return;
    e.preventDefault();
    acts[b.dataset.act](b);
  });

  // Catch up when coming back to the tab (new enquiries may have arrived).
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && st.data && !document.activeElement.matches("input, textarea")) load(false);
  });

  /* ---------------- boot ---------------- */
  // Demo mode exists only for previewing on your own computer (e.g. Live Server), where
  // the backend isn't running. On the real site the backend always answers, so it never loads.
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.hostname.endsWith(".localhost");
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });

  // The desk only works on the backend's own address (the sign-in cookie is tied to it).
  const DESK_HOST = "https://shunyaakar-studios.onrender.com";
  if (!LOCAL && location.origin !== DESK_HOST) { location.replace(`${DESK_HOST}/desk/${location.hash}`); return; }

  (async () => {
    try {
      await request("GET", "/api/auth/me");
      await load(true);
    } catch (e) {
      if (e.offline && LOCAL) {
        try { await loadScript("/desk/demo.js"); st.demo = true; } catch { /* no demo available */ }
      }
      renderLogin(e.offline && !st.demo ? "The desk's server isn't reachable right now. Try again in a minute." : "");
    }
  })();
})();
