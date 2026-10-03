/* =====================================================================
   SHUNYAAKAR — BEHAVIOUR
   Renders content from js/content.js and runs the motion:
   loader → hero portal → clapperboard reveal → process reel.
   ===================================================================== */
(() => {
  "use strict";

  const S = window.SITE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const get = (obj, path) => path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);

  const STATUS_LABEL = { done: "Done", rolling: "In progress", next: "Up next" };
  const ICON_ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h13m-5-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>';
  const ICON_SHARE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

  /* -------------------------------------------------------------------
     SOUND ENGINE (Web Audio, no files needed)
     ------------------------------------------------------------------- */
  const Sound = {
    ctx: null, master: null, analyser: null, enabled: false, // off until the speaker button is pressed
    init() {
      if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.78;
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      return this.ctx;
    },
    noise(dur) {
      const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    },
    clap() {
      const c = this.init(); if (!c) return;
      const t = c.currentTime;
      // wood crack
      const n = c.createBufferSource(); n.buffer = this.noise(0.3);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.9;
      const g = c.createGain(); g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      n.connect(bp).connect(g).connect(this.master); n.start(t); n.stop(t + 0.3);
      // body thump
      const o = c.createOscillator(); o.type = "triangle";
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      const og = c.createGain(); og.gain.setValueAtTime(0.7, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(og).connect(this.master); o.start(t); o.stop(t + 0.2);
    },
    damruHit(t, pitch, vel = 1) {
      const c = this.ctx;
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(pitch, t); o.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + 0.22);
      const g = c.createGain(); g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.36);
      const n = c.createBufferSource(); n.buffer = this.noise(0.08);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 1.4;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.45 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      n.connect(bp).connect(ng).connect(this.master); n.start(t); n.stop(t + 0.08);
    },
    whoosh() {
      const c = this.init(); if (!c) return;
      const t = c.currentTime;
      const n = c.createBufferSource(); n.buffer = this.noise(1.6);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.7); bp.frequency.exponentialRampToValueAtTime(180, t + 1.5);
      const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      n.connect(bp).connect(g).connect(this.master); n.start(t); n.stop(t + 1.6);
    },
    boom(big) {
      const c = this.init(); if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(big ? 95 : 120, t); o.frequency.exponentialRampToValueAtTime(26, t + (big ? 1.6 : 1));
      const g = c.createGain(); g.gain.setValueAtTime(big ? 1 : .6, t); g.gain.exponentialRampToValueAtTime(.001, t + (big ? 2 : 1.2));
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 2.1);
      const n = c.createBufferSource(); n.buffer = this.noise(.6);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = big ? 900 : 600;
      const ng = c.createGain(); ng.gain.setValueAtTime(big ? .7 : .35, t); ng.gain.exponentialRampToValueAtTime(.001, t + .5);
      n.connect(lp).connect(ng).connect(this.master); n.start(t); n.stop(t + .6);
    },
    // the awakening: a deep sub hit, a low brass-like swell that opens slowly, and a temple bell
    awaken() {
      const c = this.init(); if (!c) return;
      const t = c.currentTime;
      const out = c.createGain(); out.gain.value = .9; out.connect(this.master);
      // sub: felt more than heard
      const sub = c.createOscillator(); sub.type = "sine";
      sub.frequency.setValueAtTime(58, t); sub.frequency.exponentialRampToValueAtTime(34, t + 2.4);
      const sg = c.createGain(); sg.gain.setValueAtTime(.001, t); sg.gain.exponentialRampToValueAtTime(1, t + .04); sg.gain.exponentialRampToValueAtTime(.001, t + 3.2);
      sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 3.3);
      // swell: Sa and Pa in low octaves through a filter that slowly opens and closes
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 4;
      lp.frequency.setValueAtTime(120, t); lp.frequency.exponentialRampToValueAtTime(1100, t + 1.1); lp.frequency.exponentialRampToValueAtTime(260, t + 5.5);
      const bg = c.createGain(); bg.gain.setValueAtTime(.001, t); bg.gain.exponentialRampToValueAtTime(.32, t + .25); bg.gain.exponentialRampToValueAtTime(.001, t + 6);
      lp.connect(bg).connect(out);
      [55, 55.4, 82.4, 110, 110.6].forEach((fr, i) => {
        const o = c.createOscillator(); o.type = i % 2 ? "square" : "sawtooth"; o.frequency.value = fr; o.connect(lp); o.start(t); o.stop(t + 6.1);
      });
      // bell: inharmonic partials with long tails
      [[196, .16, 5.5], [275.6, .1, 4.4], [392.4, .07, 3.6], [527.8, .045, 2.8], [700.9, .03, 2.2]].forEach(([fr, v, d]) => {
        const o = c.createOscillator(); o.type = "sine"; o.frequency.value = fr;
        const g = c.createGain(); g.gain.setValueAtTime(.001, t + .05); g.gain.exponentialRampToValueAtTime(v, t + .07); g.gain.exponentialRampToValueAtTime(.0005, t + .05 + d);
        o.connect(g).connect(out); o.start(t + .05); o.stop(t + .1 + d);
      });
    },
    roll(dur) {
      const c = this.init(); if (!c) return;
      const start = c.currentTime + .02, end = start + dur; let t = start;
      while (t < end) {
        const k = (t - start) / dur;
        this.damruHit(t, 135 + k * 40, .3 + k * .9);
        t += Math.max(.035, .19 * (1 - k));
      }
    },
    duck(v, time) {
      if (!this.drone || !this.ctx) return;
      const g = this.drone.g.gain, t = this.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + time);
    },
    droneOn() {
      const c = this.init(); if (!c || this.drone) return;
      const t = c.currentTime;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 2.5);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 650; lp.Q.value = 3;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
      const lg = c.createGain(); lg.gain.value = 300; lfo.connect(lg).connect(lp.frequency); lfo.start();
      // tanpura-like: Sa (low), Sa, Pa, upper Sa, slightly detuned
      const oscs = [55, 110, 110.35, 164.8, 220.4].map((fr, i) => {
        const o = c.createOscillator(); o.type = i % 2 ? "sawtooth" : "triangle"; o.frequency.value = fr; o.connect(lp); o.start(); return o;
      });
      lp.connect(g).connect(this.master);
      this.drone = { g, oscs, lfo };
    },
    droneOff() {
      if (!this.drone) return;
      const c = this.ctx, { g, oscs, lfo } = this.drone, t = c.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => { oscs.forEach(o => o.stop()); lfo.stop(); }, 1400);
      this.drone = null;
    },
    damru(bars = 1) {
      const c = this.init(); if (!c) return 0;
      const start = c.currentTime + 0.02;
      const pattern = [[0, 150, 1], [0.1, 128, .8], [0.24, 150, 1], [0.34, 128, .8], [0.48, 150, .9], [0.55, 128, .6], [0.62, 150, 1]];
      const barLen = 0.9;
      for (let b = 0; b < bars; b++) pattern.forEach(([off, p, v]) => this.damruHit(start + b * barLen + off, p, v));
      return bars * barLen;
    }
  };

  /* -------------------------------------------------------------------
     BRAND BINDINGS
     ------------------------------------------------------------------- */
  function bindBrand() {
    const b = S.brand || {};
    $$("[data-bind]").forEach(el => { const v = get(S, el.dataset.bind); if (v) el.textContent = v; });
    $$("[data-href]").forEach(el => { const v = get(S, el.dataset.href); if (v) el.href = v; });
    // email: never show an empty or placeholder address
    if (hasEmail()) $$("#contactMail, .js-mail").forEach(m => { m.href = "mailto:" + b.email; m.textContent = b.email; });
    else {
      $$(".contact-kicker, #contactMail").forEach(el => { el.hidden = true; });
      $$(".js-mail").forEach(el => { (el.closest("li") || el).hidden = true; });
    }
    // socials: only links to an actual profile (a path after the domain), not a platform's home page
    const soc = $("#socials");
    const realSocials = (b.socials || []).filter(x => /^https?:\/\/[^/]+\/[^/?#]+/.test(x.url || ""));
    if (soc) {
      soc.innerHTML = realSocials.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join("");
      soc.hidden = !realSocials.length;
    }
    // portfolio: the owner's own cover image, or the typographic name card
    if (b.portfolioImage && $("#portfolioCard")) {
      $("#portfolioCard").outerHTML = `<img src="${esc(b.portfolioImage)}" alt="" width="736" height="920" loading="lazy">`;
    }
    renderWhatsApp();
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    if (b.founderPhoto) {
      $("#founderPhoto .portrait-img").innerHTML = `<img src="${esc(b.founderPhoto)}" alt="${esc(b.founder || "Founder")}" loading="lazy">`;
    }
    const featured = (S.films || []).find(f => f.featured);
    $("#reelBtnText").textContent = b.showreelUrl ? "Watch the showreel" : featured ? `Follow the making of ${featured.title}` : "See the films";
  }

  const PLACEHOLDER_EMAIL = "hello@shunyaakar.com";
  const hasEmail = () => { const e = ((S.brand && S.brand.email) || "").trim(); return !!e && e !== PLACEHOLDER_EMAIL; };

  /* -------------------------------------------------------------------
     WHATSAPP — only when brand.whatsapp holds a number
     ------------------------------------------------------------------- */
  const ICON_CHAT = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.6 9.4c.2 2.6 2.3 4.8 5 5.1l1.1-1.2 1.8.8-.4 1.6c-3.9.3-7.6-3.4-7.3-7.3l1.6-.4.8 1.8z" fill="currentColor"/></svg>';
  function renderWhatsApp() {
    const num = String((S.brand && S.brand.whatsapp) || "").replace(/\D/g, "");
    if (num.length < 8) return;
    const href = `https://wa.me/${num}?text=${encodeURIComponent("Hi Mayank, I found Shunyaakar and want to talk about a project.")}`;
    const fab = document.createElement("a");
    fab.className = "wa-fab"; fab.href = href; fab.target = "_blank"; fab.rel = "noopener";
    fab.setAttribute("aria-label", "Message Shunyaakar on WhatsApp"); fab.innerHTML = ICON_CHAT;
    document.body.append(fab); document.body.classList.add("has-wa");
    const facts = $(".contact-facts");
    if (facts) facts.insertAdjacentHTML("beforeend", `<div><dt>WhatsApp</dt><dd><a href="${esc(href)}" target="_blank" rel="noopener">Message me</a></dd></div>`);
    const studio = $(".footer-status"); // footer "Studio" list
    if (studio) studio.insertAdjacentHTML("afterend", `<li><a href="${esc(href)}" target="_blank" rel="noopener">WhatsApp</a></li>`);
    // keep it out of the way of the countdown and of open overlays
    const sync = () => fab.classList.toggle("is-on", !$("#loader") && $$(".room, .person").every(o => o.hidden));
    sync(); new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  }

  /* -------------------------------------------------------------------
     RENDER: divisions
     ------------------------------------------------------------------- */
  function renderWorlds() {
    const el = $("#worlds"); if (!el || !S.divisions) return;
    el.innerHTML = S.divisions.map(d => {
      const live = d.status === "live";
      const tag = live && d.link ? "a" : "div";
      const href = live && d.link ? ` href="${esc(d.link)}"` : "";
      return `<${tag} class="world tone-${esc(d.tone)} ${live ? "is-live" : "is-soon"}"${href}>
        <div class="world-top">
          <h3>${esc(d.name)}</h3>
          <span class="world-status">${live ? "Open now" : "Opening soon"}</span>
        </div>
        <div>
          <p>${esc(d.text)}</p>
          ${live
            ? `<p class="world-link" style="margin-top:1.2rem">${esc(d.linkText || "Explore")} ${ICON_ARROW}</p>`
            : `<p class="world-soon" style="margin-top:1.2rem"><span class="world-soon-dot" aria-hidden="true"></span>${esc(d.stage || "Planned")}</p>`}
        </div>
      </${tag}>`;
    }).join("");
  }

  /* -------------------------------------------------------------------
     RENDER: film board
     ------------------------------------------------------------------- */
  const TILTS = ["-1.2deg", "1.4deg", "-0.8deg", "1deg", "-1.5deg", "0.8deg"];

  function posterHTML(f) {
    if (f.poster) return `<img src="${esc(f.poster)}" alt="${esc(f.title)} poster" loading="lazy">`;
    return `<div class="poster" style="--accent:${esc(f.accent || "#FF3D8B")};--accent2:${esc(f.accent2 || "#4B63FF")}">
      <span class="poster-title">${esc(f.title)}</span>
      ${f.devanagari ? `<span class="poster-deva">${esc(f.devanagari)}</span>` : ""}
    </div>`;
  }

  function renderFilms() {
    const el = $("#filmBoard"); if (!el || !S.films) return;
    el.innerHTML = S.films.map((f, i) => `
      <article class="frame${f.featured ? " is-featured" : ""}" style="--tilt:${f.featured ? "0deg" : TILTS[i % TILTS.length]};--i:${i}">
        <button class="frame-btn" type="button" data-film="${esc(f.id)}" aria-label="${f.featured ? "Go to the making of" : "Open"} ${esc(f.title)}">
          <span class="tape" aria-hidden="true"></span>
          ${f.status ? `<span class="frame-status${/writ/i.test(f.status) ? " is-writing" : ""}">${esc(f.status)}</span>` : ""}
          <span class="frame-strip"><span class="frame-img">${posterHTML(f)}</span></span>
          <span class="frame-meta">
            <span class="frame-title">${esc(f.title)}</span>
            <span class="frame-genre">${[f.genre, f.year].filter(Boolean).map(esc).join("<br>")}</span>
          </span>
        </button>
        ${f.note ? `<p class="frame-note"><svg viewBox="0 0 70 44" aria-hidden="true"><path d="M4 6c14 30 36 36 60 26"/><path d="M52 24l12 8-10 9"/></svg><span>${esc(f.note)}</span></p>` : ""}
      </article>`).join("");

    el.addEventListener("click", e => {
      const btn = e.target.closest("[data-film]"); if (!btn) return;
      const film = S.films.find(f => f.id === btn.dataset.film); if (!film) return;
      if (film.featured && $("#making")) $("#making").scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
      else openRoom(film, btn);
    });
  }

  /* -------------------------------------------------------------------
     RENDER: process reel (used by "making of" and the film room)
     ------------------------------------------------------------------- */
  function mediaHTML(m) {
    let inner;
    if (m.src && m.type === "video") inner = `<iframe src="${esc(m.src)}" title="${esc(m.caption || "Video")}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    else if (m.src) inner = `<img src="${esc(m.src)}" alt="${esc(m.caption || "")}" loading="lazy">`;
    else inner = `<div class="shot-ph"><div>${ICON_CAMERA}<br>Coming soon</div></div>`;
    return `<figure class="shot"><div class="shot-img">${inner}</div>${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ""}</figure>`;
  }

  const stageHasContent = s => !!(s.summary || s.when || s.excerpt || (s.notes && s.notes.length) || (s.media || []).some(m => m.src));
  function stagesHTML(film) {
    return (film.stages || []).map((s, i) => {
      if (!stageHasContent(s)) return "";
      const st = ["done", "rolling", "next"].includes(s.status) ? s.status : "next";
      return `<li class="stage is-${st}">
        <span class="stage-marker" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <div class="stage-head"><h3>${esc(s.name)}</h3><span class="stage-badge">${STATUS_LABEL[st]}</span></div>
        ${s.when ? `<p class="stage-when">${esc(s.when)}</p>` : ""}
        ${s.progress ? `<div class="stage-meter" role="img" aria-label="${Number(s.progress)}% shot"><span style="--p:${clamp(Number(s.progress) / 100)}"></span><b>${Number(s.progress)}% shot</b></div>` : ""}
        ${s.summary ? `<p class="stage-summary">${esc(s.summary)}</p>` : ""}
        ${s.excerpt ? `<blockquote class="excerpt"><p>${esc(s.excerpt.text)}</p>${s.excerpt.source ? `<footer>${esc(s.excerpt.source)}</footer>` : ""}</blockquote>` : ""}
        ${s.notes && s.notes.length ? `<ul class="notes">${s.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${(s.media || []).some(m => m.src) ? `<div class="media-grid">${s.media.filter(m => m.src).map(mediaHTML).join("")}</div>` : ""}
      </li>`;
    }).join("");
  }

  function progressHTML(film) {
    const stages = film.stages || [];
    const current = stages.find(s => s.status === "rolling") || stages.find(s => s.status === "next");
    const done = stages.filter(s => s.status === "done").length;
    const pct = current && current.status === "rolling" && current.progress ? `, ${Number(current.progress)}% shot` : "";
    const label = current ? `${esc(current.name)} ${current.status === "rolling" ? "in progress" : "up next"}${pct}` : "Complete";
    return `<div class="progress">
      <div class="progress-label"><strong>${label}</strong><span>${done} of ${stages.length} stages done</span></div>
      <div class="progress-bar" role="img" aria-label="${done} of ${stages.length} stages done">${stages.map(s => `<span class="is-${esc(s.status)}"></span>`).join("")}</div>
    </div>`;
  }

  function conceptHTML(film) {
    const c = film.concept; if (!c || !c.lines) return "";
    return `${c.title ? `<h3 class="yugas-title">${esc(c.title)}</h3>` : ""}
      ${c.intro ? `<p class="yugas-sub">${esc(c.intro)}</p>` : ""}
      <p class="yuga-legend"><span>Dev</span><span>Asura</span></p>
      ${c.lines.map(l => `<div class="yuga" style="--gap:${Number(l.gap) || 0}%">
        <div><p class="yuga-line" lang="hi">${esc(l.deva)}</p><p class="yuga-gloss">${esc(l.gloss || "")}</p></div>
        <div class="yuga-gap" aria-hidden="true"><span class="dot dev"></span><span class="dot asura"></span></div>
      </div>`).join("")}
      ${c.final ? `<p class="yuga-final" lang="hi">${esc(c.final)}</p>` : ""}`;
  }

  const initials = n => String(n || "").replace(/^the\s+/i, "").split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
  function castHTML(film, clickable = true) {
    if (!film.cast || !film.cast.length) return "";
    const casting = S.callsheet && S.callsheet.open && S.callsheet.film === film.title && film.cast.some(c => !c.actor);
    return `<h3 class="cast-title">The people in ${esc(film.title)}</h3>
      ${casting ? `<p class="cast-casting"><span class="live-dot"></span>Casting now. The open roles are on the call sheet below.</p>` : ""}
      ${clickable ? `<p class="cast-hint">Tap a card to meet them.</p>` : ""}
      <ul class="cast${clickable ? " is-clickable" : ""}">${film.cast.map((c, i) => {
        const inner = `
        <span class="cast-photo" aria-hidden="true">${c.photo ? `<img src="${esc(c.photo)}" alt="" loading="lazy">` : `<span class="cast-mono">${esc(initials(c.name))}</span>`}</span>
        <span class="cast-text">
          <span class="cast-name">${esc(c.name)}</span>
          <span class="cast-role">${esc(c.role || "")}</span>
          <span class="cast-note">${esc(c.note || "")}</span>
          ${c.actor ? `<span class="cast-actor">Played by ${esc(c.actor)}</span>` : ""}
        </span>
        ${clickable ? `<span class="cast-open" aria-hidden="true">View profile ${ICON_ARROW}</span>` : ""}`;
        return `<li style="--i:${i}">${clickable
          ? `<button class="cast-card" type="button" data-person="${i}" aria-haspopup="dialog" aria-label="Open the profile of ${esc(c.name)}">${inner}</button>`
          : `<div class="cast-card">${inner}</div>`}</li>`;
      }).join("")}</ul>`;
  }

  function creditsHTML(film) {
    const rows = (film.credits || []).map(c => `<div><dt>${esc(c.role)}</dt><dd>${esc(c.name)}</dd></div>`);
    if (film.release) rows.push(`<div><dt>Release</dt><dd>${esc(film.release)}</dd></div>`);
    return rows.length ? `<dl class="credits">${rows.join("")}</dl>` : "";
  }

  function actionsHTML(film) {
    const watch = (film.watch || []).filter(w => w.url);
    return `<div class="film-actions">
      ${film.trailer ? `<button class="btn btn-brass" type="button" data-trailer="${esc(film.id)}">${ICON_PLAY} Watch the trailer</button>` : ""}
      ${watch.map(w => `<a class="btn btn-line" href="${esc(w.url)}" target="_blank" rel="noopener">Watch on ${esc(w.label)}</a>`).join("")}
      <button class="btn btn-line" type="button" data-share="${esc(film.id)}">${ICON_SHARE} Share</button>
    </div>`;
  }

  function filmLink(film) {
    return location.origin + location.pathname + (film.featured ? "#making" : "#film-" + film.id);
  }

  function initFilmActions() {
    document.addEventListener("click", async e => {
      const t = e.target.closest("[data-trailer]");
      if (t) {
        const film = S.films.find(f => f.id === t.dataset.trailer);
        if (film && film.trailer) openVideo(film.trailer, `${film.title} trailer`, t);
        return;
      }
      const sh = e.target.closest("[data-share]"); if (!sh) return;
      const film = S.films.find(f => f.id === sh.dataset.share); if (!film) return;
      const url = filmLink(film), text = `${film.title} by Shunyaakar${film.tagline ? ": " + film.tagline : ""}`;
      if (navigator.share) { try { await navigator.share({ title: film.title, text, url }); } catch (err) { /* cancelled */ } return; }
      try { await navigator.clipboard.writeText(url); toast("Link copied. Send it to someone who'd like this film."); }
      catch (err) { toast(url); }
    });
    // deep links: #film-humsaya opens that film's room
    const openFromHash = () => {
      const m = location.hash.match(/^#film-(.+)$/); if (!m) return;
      const film = (S.films || []).find(f => f.id === m[1]);
      if (film && !film.featured) openRoom(film);
    };
    window.addEventListener("hashchange", openFromHash);
    setTimeout(openFromHash, 600);
  }

  function renderMaking() {
    const film = (S.films || []).find(f => f.featured);
    const section = $("#making");
    if (!film) { if (section) section.hidden = true; return; }
    $("#makingAside").innerHTML = `
      <p class="film-big">${esc(film.title)}</p>
      ${film.devanagari ? `<p class="film-deva" lang="hi">${esc(film.devanagari)}</p>` : ""}
      ${film.tagline ? `<p class="film-tagline">${esc(film.tagline)}</p>` : ""}
      ${film.logline ? `<p class="film-logline">${esc(film.logline)}</p>` : ""}
      ${progressHTML(film)}
      ${actionsHTML(film)}
      ${creditsHTML(film)}`;
    $("#makingTitle").textContent = `The making of ${film.title}, from zero`;
    $("#makingReel").innerHTML = stagesHTML(film);
    $("#yugas").innerHTML = yugaHTML(film);
    yugaGaps = film.concept ? film.concept.lines.map(l => Number(l.gap) || 0) : [];
    if (!film.concept) $("#yugas").hidden = true;
    $("#castWrap").innerHTML = castHTML(film);
    renderNumbers(film);
  }

  /* -------------------------------------------------------------------
     FILM ROOM (overlay)
     ------------------------------------------------------------------- */
  let lastFocus = null;
  function openRoom(film, trigger) {
    const room = $("#room");
    lastFocus = trigger || document.activeElement;
    $("#roomBody").innerHTML = `
      <div class="room-hero">
        <div>
          <p class="film-big" id="roomTitle">${esc(film.title)}</p>
          ${film.devanagari ? `<p class="film-deva" lang="hi">${esc(film.devanagari)}</p>` : ""}
          <ul class="room-meta">${[film.genre, film.year, film.status].filter(Boolean).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
          ${film.tagline ? `<p class="film-tagline">${esc(film.tagline)}</p>` : ""}
          ${film.logline ? `<p class="film-logline">${esc(film.logline)}</p>` : ""}
          ${progressHTML(film)}
          ${actionsHTML(film)}
          ${creditsHTML(film)}
        </div>
        <div class="frame-strip"><div class="frame-img">${posterHTML(film)}</div></div>
      </div>
      <ol class="reel">${stagesHTML(film)}</ol>
      ${film.concept ? `<div class="yugas">${conceptHTML(film)}</div>` : ""}
      ${film.cast ? `<div class="cast-wrap">${castHTML(film, false)}</div>` : ""}`;
    showOverlay(room);
    // reveal any yuga lines inside the room straight away
    $$(".yuga, .yuga-final", room).forEach(el => setTimeout(() => el.classList.add("is-in"), 400));
  }

  function showOverlay(el) {
    el.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
    const panel = $(".room-panel", el);
    panel.scrollTop = 0;
    setTimeout(() => panel.focus(), 60);
  }
  function hideOverlay(el, after) {
    el.classList.remove("is-open");
    const other = $$(".room").some(o => o !== el && !o.hidden);
    if (!other) document.body.classList.remove("no-scroll");
    if (el.id === "reelModal") $("#room").style.zIndex = "";
    setTimeout(() => { el.hidden = true; if (after) after(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }, REDUCE ? 0 : 380);
  }

  function initOverlays() {
    const room = $("#room"), reel = $("#reelModal");
    $("#roomClose").addEventListener("click", () => hideOverlay(room));
    $("#reelClose").addEventListener("click", () => hideOverlay(reel, () => { $("#reelFrame").innerHTML = ""; }));
    [room, reel].forEach(o => o.addEventListener("click", e => {
      if (e.target === o) (o === reel ? $("#reelClose") : $("#roomClose")).click();
    }));
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!reel.hidden) $("#reelClose").click();
      else if (!room.hidden) $("#roomClose").click();
    });
    // keep Tab inside open overlays
    document.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const open = !reel.hidden ? reel : !room.hidden ? room : null; if (!open) return;
      const f = $$('a[href], button, iframe, [tabindex]:not([tabindex="-1"])', open).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    $("#reelBtn").addEventListener("click", e => {
      const url = S.brand && S.brand.showreelUrl;
      if (!url) {
        const target = $("#making") && !$("#making").hidden ? $("#making") : $("#films");
        target.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
        return;
      }
      openVideo(url, "Shunyaakar showreel", e.currentTarget);
    });
  }

  function openVideo(url, title, trigger) {
    const reel = $("#reelModal");
    lastFocus = trigger || document.activeElement;
    const src = url + (url.includes("?") ? "&" : "?") + "autoplay=1";
    $("#reelFrame").innerHTML = `<iframe src="${esc(src)}" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    $(".reel-panel", reel).setAttribute("aria-label", title);
    if (!$("#room").hidden) $("#room").style.zIndex = 85;
    showOverlay(reel);
  }

  /* -------------------------------------------------------------------
     PEOPLE — each card in "The people in AHAM" opens a profile.
     It opens like a lens iris from the card you tapped; a colour bar
     wipes across the portrait, then the name and details rise in.
     ------------------------------------------------------------------- */
  function initPeople() {
    const film = (S.films || []).find(f => f.featured);
    const wrap = $("#castWrap"), modal = $("#person");
    if (!film || !film.cast || !film.cast.length || !wrap || !modal) return;
    const panel = $(".person-panel", modal), body = $("#personBody"), n = film.cast.length;
    const TONES = ["var(--marigold)", "var(--royal)", "var(--rani)", "var(--peacock)", "#FF7A45"];
    let idx = 0, opener = null, closeT = 0;

    function fill(i) {
      const c = film.cast[i];
      const facts = [
        c.actor ? ["Played by", c.actor] : null,
        ["Character", c.name],
        ["Film", `${film.title}${film.devanagari ? ` (${film.devanagari})` : ""}`]
      ].filter(Boolean);
      body.style.setProperty("--c", TONES[i % TONES.length]);
      body.innerHTML = `<div class="person-grid">
        <figure class="person-photo">
          <span class="person-frame">${c.photo ? `<img src="${esc(c.photo)}" alt="${esc(c.actor ? `${c.actor} as ${c.name}` : c.name)}">` : `<span class="person-mono" aria-hidden="true">${esc(initials(c.name))}</span>`}</span>
          <span class="person-wipe" aria-hidden="true"></span>
          <figcaption>${esc(film.title)} · ${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}</figcaption>
        </figure>
        <div class="person-info">
          <p class="person-kicker">The people in ${esc(film.title)}</p>
          <h2 class="person-name" id="personName">${esc(c.name)}</h2>
          ${c.role ? `<p class="person-role">${esc(c.role)}</p>` : ""}
          ${c.note ? `<p class="person-note">${esc(c.note)}</p>` : ""}
          <dl class="person-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          ${c.about ? `<p class="person-about">${esc(c.about)}</p>` : (!c.photo && !c.actor ? `<p class="person-soon">Portrait and cast details coming soon.</p>` : "")}
          <div class="person-nav">
            <button class="person-step" type="button" data-pstep="-1" aria-label="Previous: ${esc(film.cast[(i - 1 + n) % n].name)}"><span aria-hidden="true">←</span> ${esc(film.cast[(i - 1 + n) % n].name)}</button>
            <button class="person-step" type="button" data-pstep="1" aria-label="Next: ${esc(film.cast[(i + 1) % n].name)}">${esc(film.cast[(i + 1) % n].name)} <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </div>`;
    }

    // the iris grows from (or shrinks back into) the centre of the card that was tapped
    function aim(from) {
      const pr = panel.getBoundingClientRect();
      let x = pr.width / 2, y = pr.height / 2;
      if (from) {
        const r = from.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) { x = r.left + r.width / 2 - pr.left; y = r.top + r.height / 2 - pr.top; }
      }
      const far = Math.hypot(Math.max(x, pr.width - x), Math.max(y, pr.height - y));
      panel.style.setProperty("--ox", `${x}px`); panel.style.setProperty("--oy", `${y}px`); panel.style.setProperty("--or", `${Math.ceil(far) + 2}px`);
    }

    function open(i, from) {
      clearTimeout(closeT);
      idx = i; opener = from || document.activeElement;
      fill(idx);
      modal.hidden = false; modal.classList.remove("is-closing");
      document.body.classList.add("no-scroll");
      panel.scrollTop = 0;
      aim(from);
      requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
      setTimeout(() => panel.focus({ preventScroll: true }), 80);
      if (Sound.enabled && Sound.ctx) Sound.whoosh();
    }

    function close() {
      if (modal.hidden || modal.classList.contains("is-closing")) return;
      const card = $(`[data-person="${idx}"]`, wrap);
      aim(card);
      modal.classList.add("is-closing"); modal.classList.remove("is-open");
      closeT = setTimeout(() => {
        modal.hidden = true; modal.classList.remove("is-closing");
        if ($$(".room").every(o => o.hidden)) document.body.classList.remove("no-scroll");
        const back = card || opener; if (back && back.focus) back.focus({ preventScroll: true });
      }, REDUCE ? 0 : 640);
    }

    function step(d) {
      idx = (idx + d + n) % n;
      body.classList.remove("is-swap"); void body.offsetWidth;
      fill(idx); body.classList.add("is-swap");
      $(`[data-pstep="${d}"]`, body)?.focus({ preventScroll: true });
    }

    wrap.addEventListener("click", e => {
      const b = e.target.closest("[data-person]"); if (b) open(Number(b.dataset.person), b);
    });
    $("#personClose").addEventListener("click", close);
    modal.addEventListener("click", e => {
      if (e.target === modal) close();
      const s = e.target.closest("[data-pstep]"); if (s) step(Number(s.dataset.pstep));
    });
    document.addEventListener("keydown", e => {
      if (modal.hidden || modal.classList.contains("is-closing")) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        const f = $$("button, a[href]", modal).filter(x => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // swipe between people on phones
    let sx = 0, sy = 0;
    panel.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    panel.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* -------------------------------------------------------------------
     SCROLL LOCK — holds the page still (loader gate, the clap)
     ------------------------------------------------------------------- */
  const Lock = {
    on: false, y: 0,
    keys: new Set([" ", "Spacebar", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]),
    stop(e) { if (Lock.on) e.preventDefault(); },
    key(e) { if (Lock.on && Lock.keys.has(e.key) && !e.target.closest("input, textarea, select, button")) e.preventDefault(); },
    hold() { if (Lock.on && Math.abs(window.scrollY - Lock.y) > 1) window.scrollTo({ top: Lock.y, behavior: "instant" }); },
    lock(y = window.scrollY) {
      Lock.y = Math.round(y); Lock.on = true;
      document.documentElement.classList.add("is-locked");
    },
    unlock() { Lock.on = false; document.documentElement.classList.remove("is-locked"); },
    init() {
      window.addEventListener("wheel", Lock.stop, { passive: false });
      window.addEventListener("touchmove", Lock.stop, { passive: false });
      window.addEventListener("keydown", Lock.key);
      window.addEventListener("scroll", Lock.hold, { passive: true });
    }
  };
  // glide the page to a position, then call done
  function glideTo(y, ms, done) {
    const y0 = window.scrollY, d = y - y0;
    if (REDUCE || Math.abs(d) < 2) { window.scrollTo({ top: y, behavior: "instant" }); done && done(); return; }
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / ms);
      Lock.y = Math.round(y0 + d * ease(k));
      window.scrollTo({ top: Lock.y, behavior: "instant" });
      if (k < 1) requestAnimationFrame(step); else done && done();
    };
    requestAnimationFrame(step);
  }

  /* -------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 3200);
  }

  /* -------------------------------------------------------------------
     TIMECODE (24 fps) — hero viewfinder and the slate
     ------------------------------------------------------------------- */
  function timecode(el, originMs) {
    const FPS = 24;
    let origin = performance.now() - originMs, frozen = false, id = null;
    const fmt = ms => {
      const f = Math.floor(ms / (1000 / FPS));
      return [Math.floor(f / (FPS * 3600)) % 24, Math.floor(f / (FPS * 60)) % 60, Math.floor(f / FPS) % 60, f % FPS]
        .map(n => String(n).padStart(2, "0")).join(":");
    };
    const paint = () => { if (!frozen && el) el.textContent = fmt(performance.now() - origin); };
    return {
      run() { frozen = false; paint(); if (!id && !REDUCE) id = setInterval(paint, 1000 / FPS); },
      reset(ms) { origin = performance.now() - ms; frozen = false; paint(); },
      freeze() { frozen = true; },
      stop() { clearInterval(id); id = null; }
    };
  }
  const msSinceMidnight = () => { const d = new Date(); return ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 + d.getMilliseconds(); };

  function initHeroTC() {
    const tc = timecode($("#heroTC"), 3600 * 1000); // programme start: 01:00:00:00
    tc.run();
    document.addEventListener("visibilitychange", () => (document.hidden ? tc.stop() : tc.run()));
  }

  /* -------------------------------------------------------------------
     LOADER — film-leader countdown
     ------------------------------------------------------------------- */
  function runLoader(done) {
    // film-leader countdown, then straight into the site (silent until the speaker is pressed);
    // skipped on repeat visits in the same tab and with reduced motion
    const loader = $("#loader");
    if (!loader) { document.body.classList.add("is-loaded"); done && done(); return; }
    const finish = () => {
      if (loader.classList.contains("is-done")) return;
      try { sessionStorage.setItem("sk_seen", "1"); } catch (e) { /* storage blocked */ }
      loader.classList.add("is-done");
      document.body.classList.add("is-loaded");
      Lock.unlock();
      setTimeout(() => loader.remove(), 1000);
      done && done();
    };
    let seen = false;
    try { seen = sessionStorage.getItem("sk_seen") === "1"; } catch (e) { /* storage blocked */ }
    if (REDUCE || seen) { finish(); return; }
    Lock.lock(window.scrollY);
    const num = $("#leaderNum");
    let n = 3;
    const tick = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(tick); finish(); return; }
      num.textContent = n;
    }, 400);
  }



  /* -------------------------------------------------------------------
     HERO PORTAL — particles orbiting a zero
     ------------------------------------------------------------------- */
  function initPortal() {
    const hero = $("#top"), pin = $(".hero-pin"), cv = $("#portal");
    if (!hero || !cv) return;
    const ctx = cv.getContext("2d");

    // split the wordmark into letters that fly apart as you pass through the zero
    const wm = $(".wm"), word = "Shunyaakar";
    if (wm) wm.innerHTML = [...word].map((ch, i) => {
      const o = i - (word.length - 1) / 2;
      const y = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 1.6 - 0.2;
      const r = (Math.cos(i * 78.233) * 12345.678 % 1) * 1.4;
      return `<span class="l" style="--o:${o.toFixed(2)};--y:${y.toFixed(2)};--r:${r.toFixed(2)}"><span class="li" style="--d:${i}">${ch}</span></span>`;
    }).join("");

    const COLS = ["#F6F0E6", "#F6F0E6", "#FFB224", "#FF3D8B", "#13C2B0", "#4B63FF"];
    const RING_COLS = ["#FF3D8B", "#FFB224", "#13C2B0", "#4B63FF"];
    const RING_Z = 700, CAM_END = 1500;
    let W = 0, H = 0, dpr = 1, F = 800, RR = 300, ring = [], stars = [];
    let p = 0, ps = 0, prevCam = 0, running = false, visible = true, whooshed = false;
    const m = { x: 0, y: 0, tx: 0, ty: 0 };

    function build() {
      const rect = pin.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      F = H * 0.95;
      const Rs = W < 700 ? Math.min(W * 0.6, H * 0.34) : Math.min(W * 0.44, H * 0.37);
      RR = Rs * RING_Z / F;
      const N = W < 700 ? 900 : 1800;
      ring = Array.from({ length: N }, () => {
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
        return { a: Math.random() * Math.PI * 2, k: 1 + g * 0.3, z: RING_Z + (Math.random() - .5) * 90, s: 0.5 + Math.random(), c: COLS[(Math.random() * COLS.length) | 0], w: 0.6 + Math.random() * 1.4 };
      });
      stars = Array.from({ length: W < 700 ? 500 : 900 }, () => ({
        x: (Math.random() - .5) * W * 5, y: (Math.random() - .5) * H * 5,
        z: 150 + Math.random() * 3600, c: COLS[(Math.random() * COLS.length) | 0], w: 0.5 + Math.random() * 1.3
      }));
    }

    function project(x, y, z, cam) {
      const dz = z - cam; if (dz < 8) return null;
      const f = F / dz;
      return [W / 2 + (x - m.x * 40) * f, H / 2 + (y - m.y * 30) * f, f];
    }

    function frame(now) {
      if (!running) return;
      const t = now / 1000;
      ps += (p - ps) * 0.1;
      m.x += (m.tx - m.x) * 0.05; m.y += (m.ty - m.y) * 0.05;
      const cam = ease(ps) * CAM_END;
      const speed = Math.abs(cam - prevCam);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round";
      const spin = t * 0.08;

      // stars: become light-streaks when you move
      for (const st of stars) {
        const a = project(st.x, st.y, st.z, cam); if (!a) continue;
        const b = speed > 0.5 ? project(st.x, st.y, st.z, prevCam - speed * 3) : null;
        const size = Math.min(3.2, st.w * a[2] * 2.2);
        ctx.globalAlpha = Math.min(1, a[2] * 3);
        ctx.strokeStyle = ctx.fillStyle = st.c;
        if (b) { ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke(); }
        else { ctx.fillRect(a[0] - size / 2, a[1] - size / 2, size, size); }
      }

      // the zero: particle ring + four flat colour arcs
      for (const q of ring) {
        const ang = q.a + spin * q.s;
        const x = Math.cos(ang) * RR * q.k, y = Math.sin(ang) * RR * q.k * .97;
        const a = project(x, y, q.z, cam); if (!a) continue;
        const size = Math.min(6, q.w * a[2] * 1.3);
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(ang * 3 + t));
        ctx.fillStyle = q.c;
        if (speed > 0.5) {
          const b = project(x, y, q.z, prevCam - speed * 2);
          if (b) { ctx.strokeStyle = q.c; ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke(); continue; }
        }
        ctx.fillRect(a[0] - size / 2, a[1] - size / 2, size, size);
      }
      const c0 = project(0, 0, RING_Z, cam);
      if (c0) {
        const rpx = RR * c0[2];
        ctx.globalAlpha = 1; ctx.lineWidth = Math.max(2, 5 * c0[2]);
        RING_COLS.forEach((col, i) => {
          const s0 = spin * 2 + i * Math.PI / 2 + 0.06, s1 = s0 + Math.PI / 2 - 0.12;
          ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(c0[0], c0[1], rpx, s0, s1); ctx.stroke();
        });
      }
      ctx.globalAlpha = 1;
      prevCam += (cam - prevCam) * 0.5;
      requestAnimationFrame(frame);
    }

    function onScroll() {
      const total = hero.offsetHeight - window.innerHeight;
      p = total > 0 ? clamp(-hero.getBoundingClientRect().top / total) : 0;
      const sp = ease(clamp(p / 0.5));
      const ts = 1 + Math.pow(clamp(p / 0.6), 2) * 3.2;
      const to = 1 - clamp((p - 0.28) / 0.22);
      const so = clamp((p - 0.46) / 0.12) * (1 - clamp((p - 0.9) / 0.1));
      const ss = 0.88 + clamp((p - 0.46) / 0.54) * 0.22;
      pin.style.setProperty("--p", p.toFixed(4));
      pin.style.setProperty("--sp", sp.toFixed(4));
      pin.style.setProperty("--ts", ts.toFixed(4));
      pin.style.setProperty("--to", to.toFixed(4));
      pin.style.setProperty("--so", so.toFixed(4));
      pin.style.setProperty("--ss", ss.toFixed(4));
      if (p > 0.45 && !whooshed) { whooshed = true; if (Sound.enabled) Sound.whoosh(); }
      if (p < 0.2) whooshed = false;
    }

    build();
    if (REDUCE) { running = true; frame(performance.now()); running = false; return; }
    window.addEventListener("resize", build);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    pin.addEventListener("pointermove", e => { m.tx = e.clientX / W - .5; m.ty = e.clientY / H - .5; });
    const start = () => { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : (running = false); }).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? (running = false) : start()));
    start();
  }

  /* -------------------------------------------------------------------
     GIANT WORD BANDS + FILM SPINE FILL (scroll-linked)
     ------------------------------------------------------------------- */
  function initScrollLinks() {
    const bands = $$(".band"), reels = [$("#makingReel")].filter(Boolean);
    if (REDUCE) { reels.forEach(r => r.style.setProperty("--fill", 1)); return; }
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      bands.forEach(b => {
        const r = b.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return;
        const off = (vh - r.top) * parseFloat(b.dataset.speed || 0);
        b.style.setProperty("--x", off.toFixed(1) + "px");
      });
      reels.forEach(rl => {
        const r = rl.getBoundingClientRect();
        rl.style.setProperty("--fill", clamp((vh * 0.6 - r.top) / r.height).toFixed(4));
      });
      yugaScroll();
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* -------------------------------------------------------------------
     HEADINGS — words rise out of a mask when they enter the screen
     ------------------------------------------------------------------- */
  function initSplit() {
    // 1) Section titles: a solid colour bar wipes across, then letters flip up in 3D behind it
    const heads = $$(".h2, .cast-title");
    if (!REDUCE) heads.forEach(h => {
      let c = 0; const frag = document.createDocumentFragment();
      [...h.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "tw-word";
            w.innerHTML = [...part].map(ch => `<span class="ch" style="--c:${c++}">${esc(ch)}</span>`).join("");
            frag.appendChild(w);
          });
        } else frag.appendChild(n.cloneNode(true));
      });
      h.textContent = ""; h.appendChild(frag); h.classList.add("tw");
    });
    // 2) Copy blocks and groups that rise / pop in with a stagger
    $$(".personal-copy, .about-copy, .music-grid > div, .studio-head, .services-head, .footer-grid").forEach(el => el.classList.add("rise"));
    const watch = $$(".tw, .rise, .stickies, .tracks, .roles, .service-list, .callsheet, .stage-meter, .method");
    if (REDUCE) { watch.forEach(el => el.classList.add("in")); return; }
    const io = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -15% 0px" });
    watch.forEach(el => io.observe(el));
  }

  /* -------------------------------------------------------------------
     CONTACT FINALE — the screen floods pink from a zero, each word of
     the last line flies in from in front of the lens, the ring draws.
     ------------------------------------------------------------------- */
  function initFinale() {
    const sec = $("#contactStage"), pin = $(".contact-pin"), title = $("#contactTitle");
    if (!sec || !pin || !title) return;
    // split the title into words (the ringed "zero" stays one piece)
    const frag = document.createDocumentFragment(); let i = 0;
    [...title.childNodes].forEach(n => {
      const add = node => { const w = document.createElement("span"); w.className = "cw"; w.style.setProperty("--rot", ((i % 2 ? 1 : -1) * (8 + (i * 7) % 14))); w.style.setProperty("--i", i++); w.appendChild(node); frag.appendChild(w); };
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(part => { if (!part) return; if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" ")); else add(document.createTextNode(part)); });
      else add(n.cloneNode(true));
    });
    title.textContent = ""; title.appendChild(frag);
    const words = $$(".cw", title);
    const set = (k, v) => pin.style.setProperty(k, v);
    if (REDUCE) { set("--flood", 1); set("--ring", 1); set("--dd", 1); words.forEach(w => w.style.setProperty("--e", 1)); return; }
    let ticking = false;
    const update = () => {
      ticking = false;
      const total = sec.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-sec.getBoundingClientRect().top / total) : 1;
      set("--flood", ease(clamp(p / .22)).toFixed(4));
      words.forEach((w, k) => w.style.setProperty("--e", ease(clamp((p - .16 - k * .055) / .13)).toFixed(4)));
      const lastEnd = .16 + (words.length - 1) * .055 + .13;
      set("--ring", ease(clamp((p - lastEnd) / .12)).toFixed(4));
      set("--dd", ease(clamp((p - lastEnd - .06) / .14)).toFixed(4));
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* -------------------------------------------------------------------
     SCRUB — elements that turn and settle as they cross the screen
     ------------------------------------------------------------------- */
  function initScrub() {
    const els = $$("[data-scrub]");
    if (!els.length) return;
    if (REDUCE) { els.forEach(e => e.style.setProperty("--v", 1)); return; }
    let ticking = false;
    const update = () => {
      ticking = false; const vh = window.innerHeight;
      els.forEach(e => {
        const r = e.getBoundingClientRect();
        const v = clamp((vh - r.top) / (vh * .75));
        e.style.setProperty("--v", ease(v).toFixed(4));
      });
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* -------------------------------------------------------------------
     MAGNETIC BUTTONS
     ------------------------------------------------------------------- */
  function initMagnetic() {
    if (!FINE || REDUCE) return;
    $$(".btn, .damru-btn, .icon-btn").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .32}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* -------------------------------------------------------------------
     CLAPPERBOARD → IRIS REVEAL
     ------------------------------------------------------------------- */
  function initClapper() {
    const stage = $("#filmsStage"), layer = $("#clapperLayer"), clap = $("#clapper");
    if (!stage || !layer || !clap) return;
    const d = new Date();
    $("#clapDate").textContent = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
    let take = 1, busy = false, timers = [];
    const slateTC = timecode($("#slateTC"), msSinceMidnight());
    slateTC.run();

    if (REDUCE) { stage.classList.add("is-revealed"); $("#clapAgain").hidden = true; return; }

    layer.hidden = false;

    function measureIris() {
      const L = layer.getBoundingClientRect(), C = clap.getBoundingClientRect();
      const cx = C.left + C.width / 2 - L.left, cy = C.top + C.height / 2 - L.top;
      // only the part of the layer inside the viewport matters visually
      const vt = Math.max(0, -L.top), vb = Math.min(L.height, window.innerHeight - L.top);
      const dx = Math.max(cx, L.width - cx), dy = Math.max(cy - vt, vb - cy);
      const r = Math.ceil(Math.hypot(dx, dy)) + 10;
      [layer, stage].forEach(el => { el.style.setProperty("--cx", cx + "px"); el.style.setProperty("--cy", cy + "px"); el.style.setProperty("--r", r + "px"); });
    }

    function run() {
      if (busy) return; busy = true;
      timers.forEach(clearTimeout); timers = [];
      // reset to the closed state without animating
      layer.style.transition = "none";
      layer.hidden = false;
      layer.classList.remove("is-open", "is-flash");
      stage.classList.remove("is-revealed", "is-revealing");
      clap.classList.remove("is-writing", "is-clapped", "is-armed");
      layer.style.removeProperty("--r"); stage.style.removeProperty("--r");
      slateTC.reset(msSinceMidnight()); slateTC.run();
      void layer.offsetWidth;
      layer.style.transition = "";

      // bring the slate to the centre of the screen and hold the page still until the iris opens
      const top = stage.getBoundingClientRect().top + window.scrollY;
      Lock.lock(window.scrollY);
      glideTo(top, 520);

      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      at(80, () => clap.classList.add("is-writing"));
      at(1150, () => clap.classList.add("is-armed"));
      at(1650, () => {
        clap.classList.remove("is-armed"); clap.classList.add("is-clapped");
        slateTC.freeze(); // smart slates freeze timecode on the clap
        layer.classList.add("is-flash");
        if (Sound.enabled) Sound.clap();
      });
      at(2150, () => {
        layer.style.transition = "none"; stage.querySelector(".iris-ring").style.transition = "none";
        measureIris();
        void layer.offsetWidth;
        layer.style.transition = ""; stage.querySelector(".iris-ring").style.transition = "";
        requestAnimationFrame(() => {
          layer.classList.add("is-open");
          stage.classList.add("is-revealing", "is-revealed");
        });
      });
      at(3100, () => Lock.unlock());
      at(3350, () => {
        layer.hidden = true; stage.classList.remove("is-revealing"); busy = false;
        slateTC.stop();
      });
    }

    // reveal without the clap if the visitor jumped straight past the films (e.g. a menu link)
    const skip = () => { layer.hidden = true; stage.classList.add("is-revealed"); slateTC.stop(); };
    // menu and anchor jumps that pass through the films should not stop the page
    let jumpAt = 0, jumpTarget = "";
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      jumpAt = performance.now(); jumpTarget = a.getAttribute("href");
    }, true);
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.disconnect();
        const jumping = performance.now() - jumpAt < 2000 && jumpTarget !== "#films";
        if (jumping || en.boundingClientRect.top < -window.innerHeight * .35) skip(); else run();
      });
    }, { rootMargin: "0px 0px -45% 0px" });
    io.observe(stage);

    $("#clapAgain").addEventListener("click", () => {
      if (busy) return;
      take += 1; $("#takeNo").textContent = take;
      layer.hidden = false;
      layer.classList.remove("is-open");
      clap.classList.remove("is-writing", "is-clapped");
      stage.classList.remove("is-revealed");
      stage.scrollIntoView({ behavior: "smooth" });
      setTimeout(run, 650);
    });
  }

  /* -------------------------------------------------------------------
     SCROLL REVEALS for the four-yuga interlude
     ------------------------------------------------------------------- */
  function yugaHTML(film) {
    const c = film.concept; if (!c || !c.lines) return "";
    return `<div class="yuga-pin" id="yugaPin">
      <div class="yuga-stage" id="yugaStage">
        <div class="yuga-head">${c.title ? `<h3>${esc(c.title)}</h3>` : ""}${c.intro ? `<p>${esc(c.intro)}</p>` : ""}</div>
        <p class="yuga-legend2"><span>Dev</span><span>Asura</span></p>
        <span class="orb dev" aria-hidden="true"></span><span class="orb asura" aria-hidden="true"></span>
        <div class="yuga-slides">${c.lines.map((l, i) => `<div class="yuga-slide${i === 0 ? " is-on" : ""}"><p class="yuga-line" lang="hi">${esc(l.deva)}</p><p class="yuga-gloss">${esc(l.gloss || "")}</p></div>`).join("")}</div>
        ${c.final ? `<p class="yuga-final-word" lang="hi">${esc(c.final)}</p>` : ""}
        ${film.tagline ? `<p class="yuga-final-line">${esc(film.tagline)}</p>` : ""}
        <ol class="yuga-ticks" aria-hidden="true">${c.lines.map(() => "<li></li>").join("")}<li></li></ol>
      </div>
    </div>`;
  }

  let yugaGaps = [], yugaEls = null, yugaIdx = -1;
  function yugaScroll() {
    const pinEl = $("#yugaPin"), stage = $("#yugaStage"); if (!pinEl || !stage) return;
    const r = pinEl.getBoundingClientRect(), total = pinEl.offsetHeight - window.innerHeight;
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const q = total > 0 ? clamp(-r.top / total) : 0;
    const n = yugaGaps.length, f = q * (n + 1);
    const idx = Math.min(n, Math.floor(f));
    // gap: smooth interpolation between line targets
    const pos = clamp(f - .5, 0, n - 1), i0 = Math.floor(pos), i1 = Math.min(n - 1, i0 + 1);
    const g = yugaGaps[i0] + (yugaGaps[i1] - yugaGaps[i0]) * ease(pos - i0);
    Realm.g = g / 100;
    if (idx === yugaIdx) return; // only touch the DOM when the yuga changes
    yugaIdx = idx;
    if (Realm.onYuga) Realm.onYuga(Math.min(idx, n));
    Realm.setFinal(idx >= n);
    yugaEls ??= { slides: $$(".yuga-slide", stage), ticks: $$(".yuga-ticks li", stage) };
    stage.classList.toggle("is-final", idx >= n);
    yugaEls.slides.forEach((s, i) => s.classList.toggle("is-on", i === Math.min(idx, n - 1)));
    yugaEls.ticks.forEach((t, i) => t.classList.toggle("is-on", i <= idx));
  }


  /* -------------------------------------------------------------------
     THE TWO REALMS — dev and asura, drawn live on a canvas.
     Dev: a calm golden yantra. Asura: cold smoke around a red slit eye.
     Yuga by yuga they pull at each other; at Kaliyug they share one body,
     torn down the middle by a seam of fire. Then, as in the script:
     the damru swells, cuts to silence, a third eye opens, and मैं।
     The awakening is slow and heavy, not a burst: a blade of light splits
     the dark, a yantra half gold and half cold blue inscribes itself
     behind the word, and long rays turn like a temple's lamp.

     Built for phones too: no live shadow blur (glows are pre-rendered
     sprites), particles drawn in batches, a lower pixel ratio on small
     screens, and the quality steps down on its own if frames run long.
     ------------------------------------------------------------------- */
  const Realm = {
    g: 0.86, final: false, finalAt: 0, merged: false, lit: false,
    setFinal(v) {
      if (v === this.final) return;
      this.final = v; this.finalAt = v ? performance.now() : 0;
      if (this.onFinal) this.onFinal(v);
    }
  };

  function initRealms() {
    const stage = $("#yugaStage"); if (!stage) return;
    const cv = document.createElement("canvas"); cv.className = "realm-canvas"; cv.setAttribute("aria-hidden", "true");
    stage.prepend(cv);
    const ctx = cv.getContext("2d", { alpha: false });
    const C = { deep: "#07050F", bone: "#F6F0E6", gold: "#FFB224", blue: "#6B7FFF", smoke: "#3A4AC0", fire: "#FF6A1F", blood: "#C8472D" };
    const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
    const small = () => W < 700 || matchMedia("(pointer: coarse)").matches;
    let W = 0, H = 0, dpr = 1, Rc = 100, span = 300, running = false, gs = Realm.g;
    let smoke = [], smokeGroups = [], embers = [], sparks = [], shocks = [], rush = [], jag = [], jagAt = 0, flash = 0, shake = 0;
    let lastIdx = -1, quality = 1, slow = 0, lastNow = 0, vig = null;
    const glows = {};

    /* a soft round glow, rendered once and stamped with drawImage (far cheaper than shadowBlur) */
    function glow(color, alpha = 1) {
      const key = color + alpha;
      if (glows[key]) return glows[key];
      const s = 128, g = document.createElement("canvas"); g.width = g.height = s;
      const c = g.getContext("2d"), grd = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      const hex = color.replace("#", ""), [r, gg, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
      grd.addColorStop(0, `rgba(${r},${gg},${b},${alpha})`); grd.addColorStop(.35, `rgba(${r},${gg},${b},${alpha * .45})`); grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      c.fillStyle = grd; c.fillRect(0, 0, s, s);
      return (glows[key] = g);
    }
    const stamp = (sprite, x, y, r, a = 1) => { ctx.globalAlpha = a; ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2); };

    function build() {
      const r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, small() ? 1.25 : 1.75);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Rc = Math.min(W, H) * (W < 700 ? .14 : .135);
      span = Math.min(W * .3, 460);
      smoke = Array.from({ length: small() ? 320 : 900 }, () => ({
        a: rnd(0, TAU), k: Math.pow(Math.random(), .7) * 1.7 + .35, s: rnd(.15, .9) * (Math.random() < .5 ? -1 : 1),
        w: [.45, .8, 1.2][Math.floor(Math.random() * 3)], z: rnd(.9, 2.4), c: Math.random() < .07 ? C.blood : Math.random() < .35 ? C.blue : C.smoke
      }));
      // batch smoke by colour and weight, so each group is one fill() call
      const map = new Map();
      smoke.forEach(q => { const k = q.c + q.w; if (!map.has(k)) map.set(k, { c: q.c, w: q.w, items: [] }); map.get(k).items.push(q); });
      smokeGroups = [...map.values()];
      embers = Array.from({ length: small() ? 46 : 110 }, () => newEmber(true));
      vig = makeVig();
    }
    function newEmber(anywhere) {
      return { x: rnd(0, W), y: anywhere ? rnd(0, H) : H + 10, v: rnd(.15, .7), d: rnd(-.25, .25), z: rnd(.8, 2.2), f: rnd(0, TAU), c: Math.random() < .7 ? C.fire : C.gold, b: Math.random() < .5 };
    }
    // the vignette is drawn once per size into its own canvas
    function makeVig() {
      const v = document.createElement("canvas"); v.width = Math.max(1, Math.round(W / 2)); v.height = Math.max(1, Math.round(H / 2));
      const c = v.getContext("2d"), g = c.createRadialGradient(v.width / 2, v.height * .46, Math.min(v.width, v.height) * .3, v.width / 2, v.height * .46, Math.max(v.width, v.height) * .75);
      g.addColorStop(0, "rgba(7,5,15,0)"); g.addColorStop(1, "rgba(7,5,15,.85)");
      c.fillStyle = g; c.fillRect(0, 0, v.width, v.height);
      return v;
    }

    /* dev: concentric rings of light points, a lotus, a burning core */
    function drawDev(x, y, R, t, a = 1) {
      ctx.save(); ctx.translate(x, y);
      ctx.globalCompositeOperation = "lighter";
      const shimmer = Math.floor(t * 5);
      [[1.3, 60, .08], [1.62, 84, -.05], [1.95, 110, .035]].forEach(([k, n, sp], ri) => {
        ctx.fillStyle = ri === 1 ? C.bone : C.gold;
        const rr = R * k * (1 + .015 * Math.sin(t * 1.2 + ri));
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = a * (pass ? .78 : .38); ctx.beginPath();
          for (let i = 0; i < n; i++) {
            if (((i + shimmer + ri) % 3 === 0) !== !!pass) continue;
            const an = i / n * TAU + t * sp, sz = i % 6 === 0 ? 2.4 : 1.2;
            ctx.rect(Math.cos(an) * rr - sz / 2, Math.sin(an) * rr - sz / 2, sz, sz);
          }
          ctx.fill();
        }
      });
      ctx.globalAlpha = a * .5; ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const an = i / 24 * TAU - t * .02, l0 = R * 1.08, l1 = R * (i % 2 ? 1.22 : 1.45);
        ctx.moveTo(Math.cos(an) * l0, Math.sin(an) * l0); ctx.lineTo(Math.cos(an) * l1, Math.sin(an) * l1);
      }
      ctx.stroke();
      ctx.save(); ctx.rotate(t * .06); ctx.globalAlpha = a * .9; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const an = i / 16 * TAU, c = Math.cos(an), s = Math.sin(an);
        const P = (u, v) => [u * c - v * s, u * s + v * c];
        ctx.moveTo(...P(R * .42, 0)); ctx.quadraticCurveTo(...P(R * .72, R * .2), ...P(R * 1.02, 0)); ctx.quadraticCurveTo(...P(R * .72, -R * .2), ...P(R * .42, 0));
      }
      ctx.stroke(); ctx.restore();
      stamp(glow(C.gold), 0, 0, R * 1.25, a * .8);
      ctx.globalAlpha = a; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, R * .34 * (1 + .04 * Math.sin(t * 1.6)), 0, TAU); ctx.fill();
      stamp(glow(C.bone), 0, 0, R * .4, a * .9);
      ctx.globalAlpha = a; ctx.fillStyle = C.bone; ctx.beginPath(); ctx.arc(0, 0, R * .14, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 1; ctx.globalAlpha = a * .7;
      ctx.beginPath(); ctx.arc(0, 0, R * .42, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    /* asura: a storm of cold smoke, a fractured crown, a red slit eye */
    function drawAsura(x, y, R, t, a = 1, pull = 0, toward = -1) {
      ctx.save(); ctx.translate(x, y); ctx.globalCompositeOperation = "lighter";
      const limit = quality;
      for (const grp of smokeGroups) {
        ctx.globalAlpha = a * .75 * grp.w; ctx.fillStyle = grp.c; ctx.beginPath();
        const m = Math.ceil(grp.items.length * limit);
        for (let i = 0; i < m; i++) {
          const q = grp.items[i];
          const an = q.a + t * q.s * .35, rr = R * q.k * (1 + .08 * Math.sin(t * 2 + q.a * 5));
          let px = Math.cos(an) * rr, py = Math.sin(an) * rr * .92;
          if (pull > 0 && q.k > 1.2) px += toward * pull * R * .9 * (q.k - 1.2);
          ctx.rect(px, py, q.z, q.z);
        }
        ctx.fill();
      }
      if (t - jagAt > .11) { jagAt = t; jag = Array.from({ length: 44 }, (_, i) => (i % 2 ? rnd(1.42, 1.78) : rnd(1.18, 1.3))); }
      [[1, -.12, 1.8, C.blue], [1.22, .08, 1, C.smoke]].forEach(([sc, sp, lw, col]) => {
        ctx.globalAlpha = a * (.55 + .35 * Math.random()); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        jag.forEach((k, i) => { const an = i / jag.length * TAU + t * sp; const px = Math.cos(an) * R * k * sc, py = Math.sin(an) * R * k * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.closePath(); ctx.stroke();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a; ctx.fillStyle = "#0B0C22"; ctx.beginPath(); ctx.arc(0, 0, R * .62, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.blue; ctx.lineWidth = 1; ctx.globalAlpha = a * .6; ctx.beginPath(); ctx.arc(0, 0, R * .62, 0, TAU); ctx.stroke();
      const blink = (t % 6.5) > 6.25 ? .08 : 1;
      ctx.globalCompositeOperation = "lighter";
      stamp(glow(C.blood), 0, 0, R * .75, a * (.6 + .4 * blink));
      ctx.globalAlpha = a; ctx.fillStyle = C.blood;
      ctx.beginPath(); ctx.ellipse(0, 0, R * .46, R * .2 * blink, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C.fire;
      ctx.beginPath(); ctx.ellipse(0, 0, R * .2, R * .17 * blink, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#05030A";
      ctx.beginPath(); ctx.ellipse(Math.sin(t * .6) * R * .05, 0, R * .035, R * .15 * blink, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    /* strands of light and smoke reaching across the gap */
    function strands(x1, x2, y, R, t, k) {
      if (k <= 0) return;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const per = small() ? 16 : 26;
      for (let s = 0; s < 7; s++) {
        const off = (s - 3) * R * .22, bend = Math.sin(t * .9 + s) * R * .5, fromDev = s % 2 === 0;
        ctx.fillStyle = fromDev ? C.gold : C.blue;
        for (let band = 0; band < 2; band++) {
          ctx.globalAlpha = k * (band ? .7 : .3); ctx.beginPath();
          for (let i = 0; i < per; i++) {
            const u = ((i / per) + t * .18 + s * .13) % 1, bright = Math.sin(u * Math.PI) > .6;
            if (bright !== !!band) continue;
            const uu = fromDev ? u : 1 - u;
            ctx.rect(x1 + (x2 - x1) * uu, y + off * (1 - Math.abs(uu - .5) * 1.2) + Math.sin(uu * Math.PI) * bend, 1.8, 1.8);
          }
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function seam(cx, cy, R, t) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = C.fire;
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push([cx + Math.sin(i * 1.7 + t * 9) * 2.5 + (Math.random() - .5) * 3, cy - R * 2.2 + i / 40 * R * 4.4]);
      [[12, .12], [5, .35], [2, 1]].forEach(([lw, al]) => {
        ctx.lineWidth = lw; ctx.globalAlpha = al; ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      });
      ctx.restore();
      if (sparks.length < 160 * quality && Math.random() < .7) sparks.push({ x: cx + rnd(-3, 3), y: cy + rnd(-R * 2, R * 2), vx: rnd(-2.4, 2.4), vy: rnd(-1.6, .4), life: 1, c: Math.random() < .5 ? C.fire : C.gold });
    }

    function shock(x, y, max, w, dur = 1500) { shocks.push({ x, y, t0: performance.now(), dur, max, w }); }

    /* the awakening: rays, a self-inscribing yantra (dev's gold on the left, asura's blue on
       the right, one circle), and the blade of light that split the dark */
    function awakening(cx, cy, t, L) {
      const big = Math.min(W, H);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      // 1. the blade: the third eye tears open the full height of the frame, then fades
      if (L < 1.4) {
        const k = clamp(L / .18), fade = 1 - clamp((L - .25) / 1.15);
        const h = H * ease(k), w = 2 + 10 * (1 - k) + 26 * Math.max(0, .3 - L);
        ctx.globalAlpha = .9 * fade; ctx.fillStyle = C.bone; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        stamp(glow(C.fire), cx, cy, big * .5 * k, .5 * fade);
      }
      // 2. a slow bloom of light behind the word, breathing
      const bloom = ease(clamp(L / 1.6)) * (.9 + .1 * Math.sin(t * 1.3));
      stamp(glow(C.gold), cx, cy, big * .62, .42 * bloom);
      stamp(glow(C.fire), cx, cy, big * .32, .35 * bloom);
      // 3. long rays, turning like a lamp in a dark temple
      const rays = small() ? 10 : 16, rl = Math.hypot(W, H) * .75, rin = ease(clamp((L - .4) / 2));
      for (let i = 0; i < rays; i++) {
        const an = i / rays * TAU + L * .035, wid = (i % 2 ? .018 : .032);
        ctx.globalAlpha = rin * (i % 2 ? .05 : .085); ctx.fillStyle = i % 2 ? C.bone : C.gold;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(an - wid) * rl, cy + Math.sin(an - wid) * rl); ctx.lineTo(cx + Math.cos(an + wid) * rl, cy + Math.sin(an + wid) * rl);
        ctx.closePath(); ctx.fill();
      }
      // 4. the yantra inscribes itself, stroke by stroke
      const p = ease(clamp((L - .3) / 2.4)), R1 = big * .34, R2 = big * .38, rot = L * .025; // starts gold-left (dev), blue-right (asura)
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.lineCap = "round";
      ctx.lineWidth = 2; ctx.globalAlpha = .7;
      ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, R1, Math.PI / 2, Math.PI / 2 + Math.PI * p); ctx.stroke();
      ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.arc(0, 0, R1, Math.PI / 2, Math.PI / 2 - Math.PI * p, true); ctx.stroke();
      ctx.lineWidth = 1; ctx.globalAlpha = .35 * p; ctx.strokeStyle = C.bone; ctx.beginPath(); ctx.arc(0, 0, R2, 0, TAU * p); ctx.stroke();
      const star = clamp((p - .35) / .65);
      if (star > 0) {
        ctx.globalAlpha = .4 * star; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.1;
        [0, Math.PI / 4].forEach(off => {
          ctx.beginPath();
          for (let i = 0; i <= 4; i++) {
            const an = off + i * Math.PI / 2, rr = R1 * .97 * (i / 4 <= star ? 1 : 0);
            if (!rr) break;
            i ? ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : ctx.moveTo(Math.cos(an) * rr, Math.sin(an) * rr);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = .45 * star; ctx.beginPath();
        for (let i = 0; i < 48; i++) {
          const an = i / 48 * TAU, l = i % 4 === 0 ? 12 : 5;
          ctx.moveTo(Math.cos(an) * R2, Math.sin(an) * R2); ctx.lineTo(Math.cos(an) * (R2 + l), Math.sin(an) * (R2 + l));
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    Realm.onFinal = on => {
      Realm.lit = false; stage.classList.remove("is-lit");
      if (on) {
        rush = Array.from({ length: small() ? 120 : 220 }, () => { const an = rnd(0, TAU), r = rnd(Math.min(W, H) * .25, Math.max(W, H) * .8); return { an, r, c: Math.random() < .5 ? C.gold : C.blue }; });
        if (Sound.enabled && Sound.ctx) { Sound.roll(1.1); Sound.duck(0, 1.2); }
      } else if (Sound.enabled && Sound.ctx) Sound.duck(.05, 1.5);
    };

    // a damru beat each time a new yuga arrives, heavier as the realms close in
    Realm.onYuga = idx => {
      if (idx === lastIdx) return;
      const prev = lastIdx; lastIdx = idx;
      if (prev === -1 || !Sound.enabled || !Sound.ctx) return;
      const t = Sound.ctx.currentTime;
      Sound.damruHit(t, 150 - idx * 12, .5 + idx * .15); Sound.damruHit(t + .12, 128 - idx * 12, .4 + idx * .12);
    };

    function frame(now) {
      if (!running) return;
      // if frames keep running long (a busy phone), draw fewer particles; recover when it's easy
      const dt = lastNow ? now - lastNow : 16; lastNow = now;
      if (dt > 24) { if (++slow > 20 && quality > .45) { quality -= .15; slow = 0; } } else if (dt < 18 && slow > -240) { if (--slow < -240 && quality < 1) { quality = Math.min(1, quality + .1); slow = 0; } }
      const t = now / 1000;
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.fillStyle = C.deep; ctx.fillRect(0, 0, W, H);
      gs += (Realm.g - gs) * .07;
      const cx = W / 2, cy = H * .46;
      const e = Realm.final ? (now - Realm.finalAt) / 1000 : 0;
      ctx.save();
      if (shake > .2) { ctx.translate(rnd(-shake, shake), rnd(-shake, shake)); shake *= .88; }

      // ash and embers rise through everything (they vanish in the silence)
      const silent = Realm.final && e > .9 && e < 1.9;
      const heat = Realm.final && e > 1.9 ? 1.25 : 1 + (1 - gs) * .8;
      if (!silent) {
        ctx.globalCompositeOperation = "lighter";
        const m = Math.ceil(embers.length * quality);
        for (let i = 0; i < m; i++) {
          const em = embers[i];
          em.y -= em.v * heat; em.x += em.d + Math.sin(t + em.f) * .2; em.f += .02;
          if (em.y < -10) Object.assign(em, newEmber(false));
        }
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = (pass ? .62 : .3) * Math.min(1, heat * .6);
          for (const col of [C.fire, C.gold]) {
            ctx.fillStyle = col; ctx.beginPath();
            for (let i = 0; i < m; i++) { const em = embers[i]; if (em.c === col && em.b === !!pass) ctx.rect(em.x, em.y, em.z, em.z); }
            ctx.fill();
          }
        }
      }

      if (!Realm.final) {
        if (!Realm.merged && gs < .04) { Realm.merged = true; shock(cx, cy, Math.max(W, H) * .6, 3); shake = 8; flash = .3; if (Sound.enabled && Sound.ctx) Sound.boom(false); }
        if (Realm.merged && gs > .12) Realm.merged = false;
        const R = Rc * (1 + (1 - gs) * .25), gap = gs * span, close = clamp((.62 - gs) / .55);
        if (gs > .03) {
          drawAsura(cx + gap, cy, R, t, 1, close, -1);
          drawDev(cx - gap, cy, R, t, 1);
          strands(cx - gap + R * .5, cx + gap - R * .5, cy, R, t, close);
        } else {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cx, H); ctx.clip(); drawDev(cx, cy, R * 1.1, t); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(cx, 0, W - cx, H); ctx.clip(); drawAsura(cx, cy, R * 1.1, t); ctx.restore();
          seam(cx, cy, R * 1.1, t);
        }
      } else if (e < .9) {
        // implosion: both halves spin and are swallowed by a single point
        const k = ease(e / .9), sc = 1 - k * .97;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * k * 5); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cx, H); ctx.clip(); drawDev(cx, cy, Rc * 1.3, t); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(cx, 0, W - cx, H); ctx.clip(); drawAsura(cx, cy, Rc * 1.3, t); ctx.restore();
        ctx.restore();
        ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 1.2;
        for (const col of [C.gold, C.blue]) {
          ctx.globalAlpha = .6 * (1 - k * .5); ctx.strokeStyle = col; ctx.beginPath();
          for (const q of rush) {
            if (q.c !== col) continue;
            const r0 = q.r * (1 - k), r1 = r0 + 30 + 120 * k;
            ctx.moveTo(cx + Math.cos(q.an) * r1, cy + Math.sin(q.an) * r1); ctx.lineTo(cx + Math.cos(q.an) * r0, cy + Math.sin(q.an) * r0);
          }
          ctx.stroke();
        }
      } else if (e < 1.9) {
        // silence, then a third eye: a thin vertical line of light slowly opening
        const k = clamp((e - 1.05) / .85), hgt = H * .34 * ease(k), wid = 1.5 + Math.pow(k, 3) * H * .03;
        ctx.globalCompositeOperation = "lighter";
        stamp(glow(C.fire), cx, cy, 40 + hgt * .6, .35 + .5 * k);
        ctx.globalAlpha = .95; ctx.fillStyle = k > .7 ? C.fire : C.bone;
        ctx.beginPath(); ctx.ellipse(cx, cy, wid, Math.max(1, hgt / 2), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = C.bone; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1, wid * .35), Math.max(1, hgt / 2 * .9), 0, 0, TAU); ctx.fill();
      } else {
        if (!Realm.lit) {
          Realm.lit = true; stage.classList.add("is-lit");
          flash = .42; shake = 6; shock(cx, cy, Math.hypot(W, H) * .7, 2.5, 2600);
          if (Sound.enabled && Sound.ctx) { Sound.awaken(); setTimeout(() => Sound.duck(.05, 4), 3200); }
        }
        awakening(cx, cy, t, e - 1.9);
      }

      // shockwaves: single thin bone rings
      ctx.globalCompositeOperation = "lighter";
      shocks = shocks.filter(sk => {
        const k = (now - sk.t0) / sk.dur; if (k > 1) return false;
        ctx.globalAlpha = (1 - k) * .8; ctx.strokeStyle = C.bone; ctx.lineWidth = sk.w * (1 - k) + .5;
        ctx.beginPath(); ctx.arc(sk.x, sk.y, 10 + ease(k) * sk.max, 0, TAU); ctx.stroke();
        return true;
      });
      sparks = sparks.filter(sp => {
        sp.x += sp.vx; sp.y += sp.vy; sp.vx *= .965; sp.vy = sp.vy * .965 - .03; sp.life -= .016;
        if (sp.life <= 0) return false;
        ctx.globalAlpha = sp.life; ctx.fillStyle = sp.c; ctx.fillRect(sp.x, sp.y, 2, 2);
        return true;
      });
      ctx.restore();
      ctx.globalCompositeOperation = "source-over";
      // the flash is a slow bloom of light, not a pop
      if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = C.bone; ctx.fillRect(0, 0, W, H); flash *= .93; if (flash < .01) flash = 0; }
      // vignette: the edges fall into darkness
      ctx.globalAlpha = 1; ctx.drawImage(vig, 0, 0, W, H);
      requestAnimationFrame(frame);
    }

    build();
    let rT = 0;
    window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(build, 150); });
    if (REDUCE) { running = true; frame(performance.now()); running = false; return; }
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !running) { running = true; lastNow = 0; requestAnimationFrame(frame); }
      if (!en.isIntersecting) running = false;
    }).observe(stage);
  }

  /* -------------------------------------------------------------------
     MUSIC — equalizer + tracks + damru
     ------------------------------------------------------------------- */
  function renderSound() {
    const snd = S.sound; if (!snd) return;
    if (snd.intro && $("#soundIntro")) $("#soundIntro").textContent = snd.intro;
    const box = $("#soundCollab"), c = snd.collab; if (!box) return;
    if (!c || !c.name) { box.hidden = true; return; }
    box.innerHTML = `
      <p class="collab-kicker">${c.film ? `The music of ${esc(c.film)}` : "In collaboration"}</p>
      <p class="collab-lockup"><span>Shunyaakar Sound</span><span class="collab-x" aria-label="with">×</span><span>${esc(c.name)}</span></p>
      ${c.founder ? `<p class="collab-founder"><span>${esc(c.name)}, founded by</span> <strong>${esc(c.founder)}</strong></p>` : ""}
      ${c.text ? `<p class="collab-text">${esc(c.text)}</p>` : ""}`;
  }

  function initMusic() {
    const cv = $("#eq"), tracksEl = $("#tracks");
    let kick = 0; // extra energy from damru hits

    if (tracksEl && S.tracks) {
      tracksEl.innerHTML = S.tracks.map((t, i) => `<li class="track" data-i="${i}">
        <button class="track-play" type="button" aria-label="Play ${esc(t.title)}">
          <svg class="i-play" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          <svg class="i-pause" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>
        </button>
        <div><p class="track-title">${esc(t.title)}</p><p class="track-meta">${esc(t.meta || "")}</p></div>
        <span class="track-status">${esc(t.status || "")}</span>
      </li>`).join("");

      let current = null; // {li, audio?, timer?}
      const stopCurrent = () => {
        if (!current) return;
        current.li.classList.remove("is-playing");
        $(".track-play", current.li).setAttribute("aria-label", "Play " + S.tracks[current.li.dataset.i].title);
        if (current.audio) current.audio.pause();
        if (current.timer) clearInterval(current.timer);
        current = null;
      };
      const audioCache = {};
      tracksEl.addEventListener("click", e => {
        const btn = e.target.closest(".track-play"); if (!btn) return;
        const li = btn.closest(".track"), t = S.tracks[li.dataset.i];
        if (current && current.li === li) { stopCurrent(); return; }
        stopCurrent();
        if (t.src) {
          Sound.init();
          let a = audioCache[li.dataset.i];
          if (!a) {
            a = new Audio(t.src); a.crossOrigin = "anonymous";
            try { Sound.ctx.createMediaElementSource(a).connect(Sound.master); } catch (err) { /* plays without the equalizer */ }
            a.addEventListener("ended", stopCurrent);
            a.addEventListener("error", () => { stopCurrent(); toast(`Couldn't load ${t.src}. Check the file path in js/content.js.`); });
            audioCache[li.dataset.i] = a;
          }
          a.currentTime = 0; a.play().catch(() => {});
          current = { li, audio: a };
        } else if (t.synth === "damru") {
          const loop = () => { Sound.damru(2); kick = 1; };
          loop();
          current = { li, timer: setInterval(loop, 1800) };
        } else {
          toast(`"${t.title}" is still being written. Add an mp3 path to it in js/content.js when it's ready.`);
          return;
        }
        li.classList.add("is-playing");
        btn.setAttribute("aria-label", "Pause " + t.title);
      });
    }

    const dBtn = $("#damruBtn");
    if (dBtn) dBtn.addEventListener("click", () => {
      Sound.damru(1); kick = 1;
      dBtn.classList.remove("is-hit"); void dBtn.offsetWidth; dBtn.classList.add("is-hit");
    });

    if (!cv) return;
    const ctx = cv.getContext("2d");
    const BARS = 48; let W, H, dpr, running = false, visible = false;
    const levels = new Float32Array(BARS);
    let freq = null;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = now => {
      if (!running) return;
      const t = now / 1000;
      if (Sound.analyser) { if (!freq) freq = new Uint8Array(Sound.analyser.frequencyBinCount); Sound.analyser.getByteFrequencyData(freq); }
      ctx.clearRect(0, 0, W, H);
      const gap = 5, bw = (W - gap * (BARS - 1)) / BARS;
      for (let i = 0; i < BARS; i++) {
        const idle = 0.12 + 0.1 * Math.sin(t * 1.6 + i * 0.35) + 0.06 * Math.sin(t * 3.1 - i * 0.8);
        const bin = Math.floor(Math.abs(i - (BARS - 1) / 2) * 2.2); // bass in the middle, mirrored
        const live = freq ? freq[Math.min(freq.length - 1, bin)] / 255 : 0;
        const target = Math.max(idle, live * 0.95, kick * (0.6 + 0.4 * Math.sin(i * 0.7 + t * 9)) * Math.exp(-Math.abs(i - BARS / 2) / 18));
        levels[i] += (target - levels[i]) * 0.22;
        const h = Math.max(4, levels[i] * H);
        const x = i * (bw + gap), y = (H - h) / 2;
        ctx.fillStyle = ["#FFB224", "#FF3D8B", "#F6F0E6", "#13C2B0"][Math.floor(i / (BARS / 4))];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, h, bw / 2); else ctx.rect(x, y, bw, h);
        ctx.fill();
      }
      kick *= 0.94;
      requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    if (REDUCE) { running = true; draw(0); running = false; return; }
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(draw); }
      if (!visible) running = false;
    }).observe(cv);
  }


  /* -------------------------------------------------------------------
     LIVE STATUS + JAIPUR CLOCK (like a studio's local time)
     ------------------------------------------------------------------- */
  function initStatus() {
    const st = S.status || {};
    if (st.film) {
      $$(".js-status").forEach(el => { el.textContent = `Now: ${st.short || `${st.film}, ${st.stage.toLowerCase()}`}`; });
      $$(".js-stage").forEach(el => { el.textContent = st.stage; });
      $$(".js-status-long").forEach(el => { el.textContent = `${st.film} in ${st.stage.toLowerCase()}${st.detail ? ". " + st.detail : ""}`; });
    }
    const tz = (S.brand && S.brand.timezone) || "Asia/Kolkata";
    let fmt;
    try { fmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }); }
    catch (e) { fmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); }
    const tick = () => { const t = fmt.format(new Date()); $$(".js-clock").forEach(el => { el.textContent = t; }); };
    tick(); setInterval(tick, 15000);
  }

  /* -------------------------------------------------------------------
     MANIFESTO — giant words that light up one by one as you scroll;
     *starred* words get a solid colour block that slams in behind them.
     ------------------------------------------------------------------- */
  function initManifesto() {
    const sec = $("#manifesto"), el = $("#manifestoText");
    if (!sec || !el || !S.manifesto) { if (sec) sec.hidden = true; return; }
    const tones = ["rani", "marigold", "peacock", "royal"]; let hi = 0;
    const words = S.manifesto.split(/\s+/).filter(Boolean);
    el.innerHTML = words.map((w, i) => {
      const m = w.match(/^\*(.+?)\*([.,!?;:]*)$/);
      if (m) return `<span class="mw-nb"><span class="mw is-hi tone-${tones[hi++ % tones.length]}" data-i="${i}"><span class="mw-t">${esc(m[1])}</span></span>${m[2] ? `<span class="mw" data-i="${i}">${esc(m[2])}</span>` : ""}</span> `;
      return `<span class="mw" data-i="${i}">${esc(w)}</span> `;
    }).join("");
    el.setAttribute("aria-label", S.manifesto.replace(/\*/g, ""));
    const spans = $$(".mw", el), sign = $(".manifesto-sign", sec);
    if (REDUCE) { spans.forEach(s => s.style.setProperty("--on", 1)); sign.style.opacity = 1; return; }
    let ticking = false;
    const update = () => {
      ticking = false;
      const total = sec.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-sec.getBoundingClientRect().top / total) : 0;
      const lit = clamp(p / .82) * words.length;
      spans.forEach(s => s.style.setProperty("--on", clamp(lit - +s.dataset.i).toFixed(3)));
      sign.style.opacity = clamp((p - .84) / .1).toFixed(3);
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* -------------------------------------------------------------------
     NUMBERS — giant counters in solid colour tiles
     ------------------------------------------------------------------- */
  function renderNumbers(film) {
    const el = $("#numbers");
    if (!el || !film.numbers || !film.numbers.length) { if (el) el.hidden = true; return; }
    const tones = ["rani", "marigold", "peacock", "royal", "bone"];
    el.innerHTML = `<h3 class="numbers-title">${esc(film.title)}, by the numbers</h3>
      <ul class="num-grid">${film.numbers.map((n, i) => `<li class="num tone-${tones[i % tones.length]}" style="--i:${i}">
        <span class="num-v" data-to="${Number(n.value) || 0}" data-from="${Number(n.from) || 0}">${Number(n.from) || 0}</span>
        <span class="num-l">${esc(n.label)}</span>
      </li>`).join("")}</ul>`;
    const vals = $$(".num-v", el);
    const run = () => {
      el.classList.add("in");
      vals.forEach((v, i) => {
        const from = +v.dataset.from, to = +v.dataset.to, dur = 1400 + i * 150, t0 = performance.now() + i * 120;
        if (REDUCE) { v.textContent = to; return; }
        const step = now => {
          const k = clamp((now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
          v.textContent = Math.round(from + (to - from) * e);
          if (k < 1) requestAnimationFrame(step);
          else if (Sound.enabled) Sound.damruHit(Sound.ctx.currentTime, 150, .5);
        };
        requestAnimationFrame(step);
      });
    };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); run(); } }, { rootMargin: "0px 0px -25% 0px" });
    io.observe(el);
  }

  /* -------------------------------------------------------------------
     CALL SHEET — open roles, styled like the real paper on set
     ------------------------------------------------------------------- */
  function renderCallsheet() {
    const el = $("#callsheet"), c = S.callsheet;
    if (!el) return;
    if (!c || !c.open || !c.roles || !c.roles.length) { el.hidden = true; const sec = $("#casting"); if (sec) sec.hidden = true; return; }
    const film = (S.films || []).find(f => f.title === c.film);
    el.innerHTML = `<div class="callsheet">
      <div class="cs-head">
        <p class="cs-kicker">Call sheet${film && film.genre ? ` · ${esc(film.genre)}` : ""}</p>
        <h3 class="cs-title">${esc(c.film)}: open roles</h3>
        <dl class="cs-meta">
          <div><dt>Where</dt><dd>${esc(c.where || "")}</dd></div>
          <div><dt>When</dt><dd>${esc(c.when || "")}</dd></div>
          <div><dt>Status</dt><dd>${esc(c.status || (film && film.status) || "Casting")}</dd></div>
        </dl>
      </div>
      <table class="cs-table">
        <thead><tr><th scope="col">Role</th><th scope="col">Who I'm looking for</th><th scope="col"><span class="sr-only">Apply</span></th></tr></thead>
        <tbody>${c.roles.map(r => `<tr>
          <th scope="row"><span class="cs-type is-${esc((r.type || "").toLowerCase())}">${esc(r.type || "")}</span>${esc(r.role)}</th>
          <td>${esc(r.who)}</td>
          <td><button class="cs-apply" type="button" data-apply="${esc(r.role)}">Apply</button></td>
        </tr>`).join("")}</tbody>
      </table>
      ${film && film.logline ? `<p class="cs-logline">${esc(film.logline)}</p>` : ""}
      <p class="cs-foot">Every role on ${esc(c.film)} is credited on screen. Tell me a little about you and send a link to anything you've made, acted in or sung.</p>
    </div>`;
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-apply]"); if (!b) return;
      prefillContact("A role in one of my films", `I'd like to be considered for ${b.dataset.apply} in ${c.film}.\n\nAbout me: `);
    });
  }

  /* -------------------------------------------------------------------
     NOTES FROM THE SET — a horizontal film strip that moves sideways
     as you scroll down (native swipe on phones)
     ------------------------------------------------------------------- */
  function renderJournal() {
    const sec = $("#journal"), cards = $("#journalCards");
    if (!sec || !cards || !S.journal || !S.journal.length) { if (sec) sec.hidden = true; return; }
    const tagTone = { script: "peacock", "pre-production": "marigold", production: "rani", post: "royal", music: "royal" };
    cards.innerHTML = S.journal.map((n, i) => `<article class="note-card tone-${tagTone[(n.tag || "").toLowerCase()] || "marigold"}" style="--i:${i}">
      ${n.image ? `<div class="note-img"><img src="${esc(n.image)}" alt="" loading="lazy"></div>` : ""}
      <p class="note-meta"><span class="note-tag">${esc(n.tag || "")}</span><span>${n.date ? esc(n.date) : `Entry ${String(i + 1).padStart(2, "0")}`}</span></p>
      <h3 class="note-title">${esc(n.title)}</h3>
      <p class="note-body">${esc(n.body)}</p>
    </article>`).join("");

    const pin = $(".journal-pin", sec), track = $("#journalTrack");
    const desktop = window.matchMedia("(min-width: 900px)");
    let dist = 0, ticking = false;
    const measure = () => {
      if (!desktop.matches || REDUCE) { sec.style.height = ""; track.style.transform = ""; sec.classList.remove("is-pinned"); return; }
      sec.classList.add("is-pinned");
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      sec.style.height = (window.innerHeight + dist) + "px";
      update();
    };
    const update = () => {
      ticking = false;
      if (!sec.classList.contains("is-pinned")) return;
      const total = sec.offsetHeight - window.innerHeight;
      const p = total > 0 ? clamp(-sec.getBoundingClientRect().top / total) : 0;
      track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
      sec.style.setProperty("--jp", p.toFixed(4));
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", measure);
    desktop.addEventListener ? desktop.addEventListener("change", measure) : desktop.addListener(measure);
    measure();
    document.fonts && document.fonts.ready.then(measure);
  }

  /* -------------------------------------------------------------------
     WORK WITH US — giant rows that flood with colour
     ------------------------------------------------------------------- */
  function renderMethod() {
    const el = $("#method"), m = S.method;
    if (!el || !m || !m.points || !m.points.length) return;
    el.innerHTML = `
      ${m.title ? `<h3 class="method-title">${esc(m.title)}</h3>` : ""}
      ${m.line ? `<p class="method-line">${esc(m.line)}</p>` : ""}
      <ol class="method-points">${m.points.map((pt, i) => `<li style="--i:${i}">
        <span class="method-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <h4>${esc(pt.title)}</h4>
        <p>${esc(pt.text)}</p>
      </li>`).join("")}</ol>`;
    el.hidden = false;
  }

  function renderServices() {
    const el = $("#serviceList"), list = S.services;
    if (!el || !list || !list.length) { if ($("#services")) $("#services").hidden = true; return; }
    el.innerHTML = list.map((sv, i) => `<li class="service tone-${esc(sv.tone || "marigold")}" style="--i:${i}">
      <button class="service-btn" type="button" data-service="${esc(sv.type || sv.title)}">
        <span class="service-title">${esc(sv.title)}</span>
        <span class="service-text">${esc(sv.text)}</span>
        <span class="service-go" aria-hidden="true">${ICON_ARROW}</span>
      </button>
    </li>`).join("");
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-service]"); if (!b) return;
      prefillContact(b.dataset.service, "");
    });
  }

  function prefillContact(type, message) {
    const sel = $("#projectType"), msg = $("#contactMessage");
    if (sel) { const opt = [...sel.options].find(o => o.text === type); if (opt) sel.value = opt.value; }
    if (msg && message && !msg.value.trim()) msg.value = message;
    const form = $("#contactForm");
    if (form) {
      form.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "center" });
      setTimeout(() => { const n = form.querySelector('[name="name"]'); if (n) n.focus({ preventScroll: true }); }, REDUCE ? 0 : 900);
    }
  }

  /* -------------------------------------------------------------------
     FORMS — Netlify Forms over AJAX, with an honest fallback
     ------------------------------------------------------------------- */
  function initForms() {
    // Both forms post JSON to the site's own API (netlify/functions). An error the server
    // explains (a bad email, too many messages) is "told"; anything else means the API
    // isn't reachable (e.g. Live Server on localhost), so we fall back.
    // Same host as the backend (Render, or the backend running locally): relative /api/… URLs.
    // Any other public host (e.g. a static copy of the site): post to SITE.brand.apiUrl.
    const api = ((S.brand && S.brand.apiUrl) || "").replace(/\/+$/, "");
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const base = api && !local && location.origin !== api ? api : "";
    const send = form => fetch(base + form.getAttribute("action"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    }).then(async r => {
      const d = await r.json().catch(() => null);
      if (r.ok && d && d.ok) return d;
      const err = new Error((d && d.error) || "offline");
      err.told = !!(d && d.error);
      throw err;
    });
    const email = (S.brand && S.brand.email) || "";

    const contact = $("#contactForm");
    if (contact) contact.addEventListener("submit", e => {
      e.preventDefault();
      const btn = $("#contactSubmit"); btn.disabled = true; btn.textContent = "Sending";
      send(contact).then(() => {
        contact.classList.add("is-sent"); $("#formDone").hidden = false;
        if (Sound.enabled) Sound.clap();
        toast("Message received.");
      }).catch(err => {
        btn.disabled = false; btn.textContent = "Send it";
        if (err.told) { toast(err.message); return; }
        const d = new FormData(contact);
        const body = encodeURIComponent(`${d.get("message") || ""}\n\n${d.get("name") || ""}\nProject: ${d.get("project") || ""}\nTimeline: ${d.get("timeline") || ""}`);
        if (!hasEmail()) { toast("The form isn't connected yet. Please message on Instagram or WhatsApp."); return; } // keeps what they typed
        toast("The form couldn't reach the studio. Opening your email app instead.");
        setTimeout(() => { location.href = `mailto:${email}?subject=${encodeURIComponent("Project: " + (d.get("project") || ""))}&body=${body}`; }, 900);
      });
    });

    const letters = $("#lettersForm");
    if (letters) letters.addEventListener("submit", e => {
      e.preventDefault();
      const btn = $("button", letters); btn.disabled = true;
      send(letters).then(() => {
        letters.innerHTML = `<p class="letters-done">You're on the list. Thank you.</p>`;
      }).catch(err => {
        btn.disabled = false;
        toast(err.told ? err.message : "Sign-up isn't available right now. Please try again later.");
      });
    });
  }

  /* -------------------------------------------------------------------
     FOOTER WORDMARK — letters rise as you reach the end
     ------------------------------------------------------------------- */
  function initFooterMark() {
    // the particles that began the site as a zero assemble into the name at the end
    const box = $("#footerMark"); if (!box) return;
    const cv = $("canvas", box), ctx = cv.getContext("2d");
    const WORD = "SHUNYAAKAR";
    let W = 0, H = 0, dpr = 1, pts = [], p = 0, ps = 0, running = false, built = false;
    const mouse = { x: -9999, y: -9999 };

    function build() {
      const r = box.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // draw the word offscreen, fitted to the full width, and sample its pixels
      const off = document.createElement("canvas"); off.width = Math.round(W); off.height = Math.round(H);
      const o = off.getContext("2d");
      let fs = 100; o.font = `800 ${fs}px Unbounded, "Arial Black", sans-serif`;
      const wAt100 = o.measureText(WORD).width;
      fs = Math.min(100 * W / wAt100 * .995, H * .62);
      o.font = `800 ${fs}px Unbounded, "Arial Black", sans-serif`;
      o.textBaseline = "middle"; o.textAlign = "center"; o.fillStyle = "#fff";
      o.fillText(WORD, W / 2, H * .52);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      let area = 0; for (let i = 3; i < data.length; i += 16) if (data[i] > 128) area += 4;
      const step = Math.max(2, Math.round(Math.sqrt(area / 15000)));
      pts = [];
      for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          const an = Math.random() * Math.PI * 2, rr = H * (.9 + Math.random() * 1.6);
          pts.push({
            tx: x, ty: y, sx: W / 2 + Math.cos(an) * rr * (W / H) * .35, sy: H / 2 + Math.sin(an) * rr * .5,
            d: x / W * .45 + Math.random() * .2, ox: 0, oy: 0, z: step * (1.05 + Math.random() * .3),
            ember: Math.random() < .045, f: Math.random() * 6.28
          });
        }
      }
      built = true;
    }

    function progress() {
      const r = box.getBoundingClientRect(), vh = window.innerHeight;
      return clamp((vh - r.top) / (r.height * .7 + vh * .12));
    }

    function frame(now) {
      if (!running) return;
      const t = now / 1000;
      p = REDUCE ? 1 : progress();
      ps += (p - ps) * .08;
      ctx.clearRect(0, 0, W, H);
      const sweep = ((t * .12) % 1.6 - .3) * W;
      for (const q of pts) {
        const k = ease(clamp((ps * 1.5 - q.d) / .75));
        let x = q.sx + (q.tx - q.sx) * k, y = q.sy + (q.ty - q.sy) * k;
        // the cursor pushes the grains apart; they spring back into the letters
        const dx = x + q.ox - mouse.x, dy = y + q.oy - mouse.y, dd = dx * dx + dy * dy;
        if (dd < 6400) { const f = (80 - Math.sqrt(dd)) / 80; q.ox += dx * f * .12; q.oy += dy * f * .12; }
        q.ox *= .9; q.oy *= .9;
        x += q.ox; y += q.oy;
        const near = Math.abs(x - sweep) < W * .06 ? 1 - Math.abs(x - sweep) / (W * .06) : 0;
        if (q.ember) { ctx.fillStyle = "#FFB224"; ctx.globalAlpha = .55 + .45 * Math.abs(Math.sin(t * 2 + q.f)); }
        else { ctx.fillStyle = "#F6F0E6"; ctx.globalAlpha = (.3 + .6 * k) * (.82 + .18 * near) + near * .1; }
        ctx.fillRect(x, y, q.z, q.z);
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    const init = () => { build(); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
      if (document.fonts && document.fonts.load) document.fonts.load('800 100px Unbounded').then(init, init); else init();
    });
    window.addEventListener("resize", () => { if (built) build(); });
    box.addEventListener("pointermove", e => { const r = box.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    box.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([en]) => { if (en.isIntersecting) start(); else running = false; }, { rootMargin: "200px 0px" }).observe(box);
  }

  /* -------------------------------------------------------------------
     NAV, CURSOR, MARQUEE, SOUND TOGGLE
     ------------------------------------------------------------------- */
  function initNav() {
    const nav = $("#nav"), menuBtn = $("#menuBtn");
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 30);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

    const closeMenu = () => { nav.classList.remove("menu-open"); menuBtn.setAttribute("aria-expanded", "false"); menuBtn.setAttribute("aria-label", "Open menu"); };
    menuBtn.addEventListener("click", () => {
      const open = !nav.classList.contains("menu-open");
      nav.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$("#navLinks a").forEach(a => a.addEventListener("click", closeMenu));

    const links = $$("#navLinks a");
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(ens => ens.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.classList.remove("is-active"));
      const id = { portfolio: "about", manifesto: "", studio: "", top: "" }[en.target.id] ?? en.target.id;
      const l = map.get(id); if (l) l.classList.add("is-active");
    }), { rootMargin: "-45% 0px -50% 0px" });
    ["top", "manifesto", "studio", "films", "making", "journal", "music", "services", "portfolio", "about", "contact"].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });

    $("#soundBtn").addEventListener("click", () => {
      setSound(!Sound.enabled);
      toast(Sound.enabled ? "Sound on." : "Sound off. Turn it back on with the speaker button.");
    });
    // pause everything when the tab is hidden, resume when it comes back
    document.addEventListener("visibilitychange", () => {
      if (!Sound.ctx) return;
      if (document.hidden) Sound.ctx.suspend(); else if (Sound.enabled) Sound.ctx.resume();
    });
  }

  function setSound(on, quiet) {
    Sound.enabled = on;
    const btn = $("#soundBtn");
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
    if (on) { Sound.init(); Sound.droneOn(); }
    else { Sound.droneOff(); $$("audio").forEach(a => a.pause()); }
  }

  function initCursor() {
    const c = $("#cursor"); if (!c || !FINE || REDUCE) return;
    let x = -100, y = -100, tx = -100, ty = -100;
    window.addEventListener("pointermove", e => { tx = e.clientX; ty = e.clientY; c.classList.add("is-on"); }, { passive: true });
    document.addEventListener("pointerleave", () => c.classList.remove("is-on"));
    document.addEventListener("pointerover", e => {
      c.classList.toggle("is-hover", !!e.target.closest("a, button, [data-film]"));
    });
    const loop = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; c.style.transform = `translate3d(${x}px, ${y}px, 0)`; requestAnimationFrame(loop); };
    loop();
  }


  /* -------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindBrand();
    renderWorlds();
    renderFilms();
    renderMaking();
    renderCallsheet();
    renderSound();
    renderJournal();
    renderServices();
    renderMethod();
    initFooterMark();
    initStatus();
    initManifesto();
    initOverlays();
    initPeople();
    initFilmActions();
    initForms();
    initNav();
    initHeroTC();
    Lock.init();
    initPortal();
    initScrollLinks();
    initSplit();
    initFinale();
    initScrub();
    initRealms();
    initMagnetic();
    initClapper();
    initMusic();
    runLoader();
  });
})();
