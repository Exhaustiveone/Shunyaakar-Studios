# CLAUDE.md — Shunyaakar Studio website

> Handoff document for Claude Code (and for editing in Antigravity).
> Put this file at the **root of the repo**, next to `index.html`. Claude Code reads `CLAUDE.md` automatically at the start of every session.
> Everything below reflects the site as of 27 Sep 2026, after many design rounds with the owner. **Read sections 2 and 3 before changing anything visual.** They record what the owner has already rejected.

---

## 1. Who this is for, and what the site is

- **Owner:** Mayank Sharma, filmmaker, photographer and creative director from Jaipur (Jagatpura / Ramnagariya). He is a final-year civil engineering student at SKIT and is building a production house.
- **Brand:** **Shunyaakar** (शून्याकार), "the shape of zero". Motto on the site: *every story starts at zero*. Footer line: "शून्य से, सब कुछ।"
- **What the site is:** the founding website of a full-spectrum production house. Films and Music are live divisions; VFX and Animation are shown as "opening soon". It also works as an open notebook, showing the complete process of the first short film, **AHAM**, from script to release.
- **His separate personal portfolio** (photography, design, travel) lives at `https://shunyaakar.netlify.app`. This site links to it; it is a different site.
- **Tech:** plain static site. HTML, CSS and vanilla JS. **No framework, no build step, no npm dependencies.** Deploy target is **Netlify, from the GitHub repo** (drag-and-drop can't deploy functions). A small backend (Netlify Functions + Supabase + Resend) handles the two forms and the private `/desk/`; see section 14 and `BACKEND.md`.
- **Editing tools:** Claude Code (this repo via GitHub) and **Antigravity** (a VS Code-style IDE). Preview locally with the **Live Server** extension, or `python -m http.server 5500`, then open `http://localhost:5500`.

---

## 2. Design direction: what the owner wants (hard-won, respect it)

The owner's own words across the design rounds: *"larger than life"*, *"another universe vibe"*, *"immersive, an experience of a lifetime"*, *"professional but not too much, like a production house"*, *"the bestest"*.

**The current visual system (keep it):**
- **Flat, solid colours only. No gradient colour washes.** The owner explicitly rejected a gradient "light leak" version. Glows (text-shadow / canvas shadowBlur) are acceptable for fire and light effects, and a dark vignette is fine, but no multi-colour gradient fills.
- **Rajasthan palette** on deep ink:
  - `--ink #0E0A1C` (page background) and `--ink-deep #07050F`
  - `--bone #F6F0E6` (text)
  - `--rani #FF3D8B` (Films, contact section)
  - `--marigold #FFB224` (Music, main buttons, portfolio section)
  - `--peacock #13C2B0` (done / VFX)
  - `--royal #4B63FF` (The Other / asura / Animation); the music section background is `#3346E0`
  - `--paper #F3EDE1` (script pages, call sheet, notes)
  - `--spectrum` is a *hard-stop* four-block bar (rani, marigold, peacock, royal), not a gradient
- **Fonts** (Google Fonts):
  - **Unbounded** (bold, wide headings)
  - **Bricolage Grotesque** (body)
  - **Caveat** (handwriting, used only where a filmmaker would write: slate, notes, stickies, taglines)
  - **Courier Prime** (screenplay pages and the call sheet)
  - **Rozha One** (all Hindi / Devanagari, chosen as the best Devanagari display face)
- **Motion:** big, scroll-driven, cinematic moments (pinned sections, canvases, the clap). Motion must mean something in film terms (slate, iris, leader countdown, timecode, film strip, projector).
- **Sound is part of the experience:** a tanpura drone, damru beats, the clap, whooshes and booms, all synthesised with Web Audio (no audio files needed).

**Tone of "The idea underneath" (AHAM section):** psychological and mythological, **intense, not a party**. The owner rejected a version whose reveal used a big pink circle and rainbow rings as "party vibes". The current version is black, gold, cold blue and fire only.

**Footer wordmark:** must be **epic and single-colour**. The owner rejected a multicolour "funky" version. It is now bone-white particles, with a few ember flecks, assembling "SHUNYAAKAR".

**The custom cursor circle was removed at the owner's request.** Don't bring it back.

## 3. Directions already rejected (don't repeat them)

1. **Very funky / cartoon collage** (marker fonts, blobs, doodles, crowns, speech bubbles). Too funky. (Some *restrained* echoes remain on purpose: taped film frames, sticky notes, the pinned collage.)
2. **"Projection room"**: indigo plus brass, Bodoni Moda serif, minimal. The owner said *"colours are very boring"*.
3. **"Light leak"**: the same palette with soft blurred gradient blooms. The owner said *"the gradient effect looks a little off"*. That is why everything is flat now.
4. **Party-style reveal** of मैं। (pink disc, rainbow rings, confetti bursts).
5. **Multicolour footer wordmark.**
6. **Custom cursor circle.**

---

## 4. File structure

```
/
├── index.html        page structure (all sections, the 2 forms → /api/*, SEO + JSON-LD, share-card meta)
├── 404.html          "This scene was cut." page with a clapping slate (Netlify serves it automatically)
├── README.md         owner-facing guide (how to edit content, deploy, tweak timings)
├── BACKEND.md        owner-facing backend setup (Supabase, Resend, Netlify env vars) and desk guide
├── netlify.toml      functions dir, desk headers, 404s for repo-only files
├── netlify/functions/ contact, subscribe, unsubscribe, desk, keepalive (plain ESM, fetch only)
├── netlify/lib/      http.mjs, db.mjs (Supabase REST), mail.mjs (Resend + email templates)
├── supabase/schema.sql  tables + RLS (run once in the Supabase SQL editor)
├── desk/             the private studio desk (index.html, desk.css, desk.js, demo.js)
├── CLAUDE.md         this file
├── css/style.css     all styles (~1200 lines); tokens in :root at the top
├── js/content.js     ★ ALL CONTENT as window.SITE (films, stages, journal, roles, services, tracks, links)
├── js/main.js        all behaviour (~1700 lines, one IIFE, no dependencies)
└── assets/
    ├── img/portfolio-collage.webp   the clickable collage linking to his personal portfolio
    ├── img/share-card.png           1200×630 link-preview image (og:image)
    ├── audio/   (empty) mp3s for tracks go here
    └── video/   (empty)
```

**Rule: content lives in `js/content.js`; `main.js` renders it.** When the owner asks to change text, films, roles, journal entries, stats or links, edit `content.js`, not the HTML. Exceptions that are static in `index.html`: the hero lede, section intro paragraphs, the About copy, the contact form fields, and the footer. The two forms post to `/api/contact` and `/api/subscribe` (see section 14).

---

## 5. Page order and how each part works

Scroll order, with the key selector and function for each part:

1. **Loader and entrance gate** (`#loader`, `runLoader`). A film-leader countdown (3, 2, 1) then an entrance screen: **"Enter with sound"** or "Enter without sound". Browsers block audio until a user gesture, so this click is what turns sound on. Scroll is locked (`Lock`) until the visitor enters. Sound defaults to ON (`Sound.enabled = true`, the speaker button starts `aria-pressed="true"`).
2. **Hero: fly through the zero** (`.hero`, 290vh, pinned; `initPortal`).
   - A canvas draws a 3D starfield and a particle ring with four flat-colour arcs (the "zero").
   - Scrolling flies the camera through the ring; stars become light streaks.
   - The letters of "Shunyaakar" scatter in 3D (CSS vars `--sp`, `--ts`, `--to`), then "Every story starts at zero." appears.
   - A viewfinder frames it all: REC dot, running timecode (`initHeroTC`), a live Jaipur clock, and a "Now: AHAM, pre-production" status line.
   - The main button reads "Follow the making of AHAM" until a showreel URL exists; then it becomes "Watch the showreel".
3. **Giant word bands** (`.bands`, `initScrollLinks`). Two huge rows that slide sideways with scroll (`data-speed`).
4. **Manifesto** (`.manifesto`, 300vh, pinned; `initManifesto`). Giant words light up one by one; `*starred*` words in `SITE.manifesto` get a solid colour block. Signed "Mayank Sharma, founder" in Caveat.
5. **Studio / worlds** (`#studio`, `renderWorlds`). Four division cards: Films and Music live (solid rani / marigold); VFX and Animation dashed, with "% built" meters.
6. **Films and the clapperboard** (`#films`, `initClapper`).
   - A full-screen colourful clapper writes itself in (Caveat), claps with flash, shake and sound, the slate's timecode freezes on the clap, and a marigold iris closes to reveal the film board.
   - **While it claps, scroll is locked:** `glideTo` centres the slate, then `Lock.lock()`, and `Lock.unlock()` fires at 3100 ms.
   - Menu or anchor jumps that pass through (e.g. clicking "Process") **skip** the clap and just reveal the board. A click on "Films" itself still plays it.
   - "Clap again" replays it with Take + 1.
   - Film cards are taped film-strip frames with Venn-circle posters (`posterHTML`, colours `accent` and `accent2`).
7. **Making of AHAM** (`#making`, `renderMaking`):
   - **Aside:** big title, अहम्, tagline, logline, stage progress bar, Share / trailer / watch buttons (`actionsHTML`) and a credits grid (`creditsHTML`, A24-style).
   - **Stages reel** (`stagesHTML`): Script, Pre-production, Production, Post, Release. Each has a status (done / rolling / next), a script excerpt on a paper page, sticky notes, and media. **Media with an empty `src` is hidden.**
   - **"AHAM, by the numbers"** (`renderNumbers`): solid tiles counting 23, 29, 7, 1, and **0 lighting kits (counts down from 12)**.
   - **"The idea underneath"** (`yugaHTML`, `yugaScroll`, `Realm`, `initRealms`). This is the signature section; see section 6.
   - **Characters** (`castHTML`), with one "Casting now" line when the call sheet is open.
   - **Call sheet** (`renderCallsheet`): a paper call sheet of open cast and crew roles. "Apply" pre-fills the contact form.
8. **Notes from the set** (`#journal`, `renderJournal`). Production-diary cards. On desktop (≥900px) the section pins and the cards move sideways as you scroll down; on phones it's a native swipe row.
9. **Shunyaakar Sound** (`#music`, `initMusic`). Solid blue section with a live equaliser canvas, a "Play the damru" button, and a tracklist (mp3 from `src`, or `synth: "damru"`).
10. **Work with us** (`#services`, `renderServices`). Huge rows that flood with their colour on hover; clicking pre-fills the form's project type.
11. **Personal portfolio** (`#portfolio`). Solid marigold section; the pinned collage swings in with 3D scroll-scrub (`data-scrub`, `initScrub`) and links to `brand.portfolioUrl`.
12. **About** (`#about`). Polaroid portrait: `brand.founderPhoto`, or an "MS" monogram until a photo exists. Plus three sticky notes.
13. **Contact finale** (`#contact`):
    - `.contact-stage` (230vh, pinned; `initFinale`): pink floods out from a circle, each word of "Let's make something from zero." flies in from in front of the lens, then a ring draws around "zero". A rotating "Open for new projects" seal lands on desktop.
    - `.contact-body`: the **contact form** (→ `/api/contact`), plus the email, a live clock, current status and socials.
14. **Footer:**
    - "Letters from the set", the newsletter sign-up (→ `/api/subscribe`).
    - Explore and Studio columns, including the live Jaipur clock.
    - **SHUNYAAKAR assembled from particles** (`initFooterMark`, canvas in `#footerMark`). The particles from the opening zero fly in left-to-right and form the name as you reach the bottom; the cursor scatters the grains and they spring back.
15. **Overlays:**
    - Film room (`#room`, `openRoom`): the full process page for non-featured films. Deep links like `#film-humsaya` open it directly.
    - Video modal (`#reelModal`, `openVideo`): shared by the showreel and trailers.
    - Toast (`toast()`).

---

## 6. "The idea underneath": the concept (read before touching it)

The mythological spine of AHAM, taken from the script's ending: in every yuga, good and evil draw closer, until in Kaliyug they share one body, and the demon shrinks to just "I".

```
सत्ययुग में — देव और असुर अलग लोक में थे।   Satyug: separate worlds
त्रेतायुग में — एक ही धरती पर।             Treta: the same earth
द्वापरयुग में — एक ही घर में।              Dwapar: the same house
कलियुग में — एक ही शरीर में।               Kaliyug: the same body
मैं।
```

Implementation: `yugaHTML` builds the pinned stage (`.yuga-pin` 520vh, `.yuga-stage` sticky). `yugaScroll` (called from `initScrollLinks`) maps scroll to `Realm.g` (the gap, from `concept.lines[].gap`), the current line, and `Realm.setFinal()`. `initRealms` draws everything on one canvas.

- **Dev:** a calm golden yantra. Dotted rings, radial lines, a 16-petal lotus, a glowing gold core (`drawDev`).
- **Asura:** a cold blue smoke storm. Around 1100 particles, two flickering fractured crowns, a dark core, and a **red slit eye** that blinks (`drawAsura`).
- Each new yuga lands on a **damru double-beat** (`Realm.onYuga`). As the realms close in, **strands** of gold light and blue smoke pull across the gap (`strands`).
- **Kaliyug:** one body. The left half is dev and the right half is asura, torn by a trembling **seam of fire** throwing sparks (`seam`). The merge fires one thin bone shockwave, a screen shake and a boom.
- **Final sequence** (time-based after `Realm.setFinal(true)`, following the script: *"the damru swells, then cuts to silence. Then: मैं।"*):
  1. 0 to 0.9 s: implosion. The halves spin and shrink into a point while light streaks rush inward; `Sound.roll()` plays an accelerating damru.
  2. 0.9 to 1.9 s: **silence and darkness** (`Sound.duck(0)`). A vertical line of light opens like a **third eye**.
  3. At 1.9 s: ignition. A flash, one bone shockwave, a burst of sparks, `Sound.boom(true)`, and `.yuga-stage.is-lit` is added. The DOM word `.yuga-final-word` (Rozha One, bone, fire glow) rises out of blur, standing inside a **ring of real flames** (the `flames` particles). This echoes the "figure calm inside a ring of fire" from Veer's sketchbook in the script.
  4. The film tagline fades in underneath (`.yuga-final-line`). The drone returns after about 2.5 s.
- **Palette in this section:** black, gold, cold blue, fire orange `#FF6A1F`, blood `#C8472D`. **Never pink, rainbow or confetti here.**

---

## 7. Shared systems in main.js

| System | What it does | Notes |
|---|---|---|
| `Sound` | Web Audio synth: `clap`, `damruHit`, `damru`, `roll`, `whoosh`, `boom(big)`, `droneOn/Off` (tanpura-like), `duck(v,t)`, plus an `analyser` for the EQ | `Sound.enabled` defaults to true, but nothing plays until `Sound.init()` runs on a user gesture (the gate). Always guard with `if (Sound.enabled && Sound.ctx)`. |
| `setSound(on)` | Toggles state, the speaker button's aria, and the drone | Used by the gate and the nav speaker button. Sound suspends when the tab is hidden. |
| `Lock` + `glideTo` | Blocks wheel, touch, keys and scrollbar drags; holds `scrollY` | Used by the loader gate and the clap. Must always be unlocked. |
| `Realm` | State for the yuga canvas (`g`, `final`, `lit`, `onYuga`, `onFinal`) | See section 6. |
| `timecode()` | 24 fps SMPTE-style timecode | Hero viewfinder and the slate (freezes on the clap). |
| `initSplit` | Section titles (`.h2`, `.cast-title`) get the "colour bar wipes across, letters flip up in 3D" reveal (`.tw`); blocks get `.rise` | Bar colour per section via `--wipe`. |
| `initScrub` | Elements with `data-scrub` get `--v` (0 to 1) as they cross the screen | Portfolio collage and portrait. |
| `initMagnetic` | Buttons drift slightly toward the pointer | Fine pointers only. |
| `initStatus` | Fills `.js-status`, `.js-status-long`, `.js-stage` and `.js-clock` (Asia/Kolkata) from `SITE.status` | |
| `initFilmActions` | Share (Web Share API, or copy link), trailer buttons, `#film-<id>` deep links | |
| `initForms` | Posts JSON to the form's `action` (`/api/contact`, `/api/subscribe`) with a "Received" stamp | Server validation errors show as a toast; if the API isn't reachable (Live Server) it falls back to a `mailto:`. |
| `prefillContact(type, msg)` | Selects the project type, pre-fills the message, scrolls to the form | Used by the call sheet and services. |

All animations respect `prefers-reduced-motion` (`REDUCE`): pins become static and canvases draw one frame.

Boot order is at the bottom of `main.js` (`DOMContentLoaded`). Render functions run before the `init*` functions that depend on their DOM (e.g. `renderCallsheet` must run before `initStatus`, and `renderMaking` before `initRealms`).

---

## 8. `js/content.js` schema (`window.SITE`)

- `brand`: `name`, `founder`, `location`, `email` (**placeholder `hello@shunyaakar.com`, to replace**), `portfolioUrl`, `showreelUrl`, `founderPhoto`, `replyTime`, `timezone`, `socials[]` (**placeholder links, to replace**)
- `status`: `{ film, stage, detail }`, shown in the hero, call sheet, contact and footer
- `manifesto`: a string; `*word*` gets a highlight
- `divisions[]`: `{ name, status: "live"|"soon", tone, text, link?, linkText?, progress? }`
- `films[]`, each with:
  - `id`, `featured` (only **one** film may be `true`; it gets the Making-of section), `title`, `devanagari`, `year`, `genre`, `status`, `accent`, `accent2`, `poster`
  - `tagline`, `logline`, `note`, `trailer`, `watch[{label,url}]`, `release`, `credits[{role,name}]`, `numbers[{value,from?,label}]`
  - `stages[{ name, status, when, summary, excerpt?{text,source}, notes[], media[{type:"image"|"video", src, caption}] }]`
  - `concept{ title, intro, lines[{deva,gloss,gap}], final }`
  - `cast[{ name, role, note, actor }]`
- `journal[]`: `{ tag: Script|Pre-production|Production|Post|Music, date, title, body, image }`
- `callsheet`: `{ open, film, where, when, roles[{role, who, type: "Cast"|"Crew"}] }`. Set `open:false` to hide it.
- `services[]`: `{ title, text, type, tone }`. **`type` must exactly match an `<option>` in the contact form's `<select name="project">` in index.html.**
- `tracks[]`: `{ title, meta, status, src, synth? }`

---

## 9. AHAM facts (from the owner's final-draft script, `AHAM_FD.pdf`)

Use these; don't invent story details.

- **Title:** AHAM (अहम्), by Mayank Sharma. **Genre:** Mythological & Psychological. **Tagline:** "A film about the self that hides, and the self that answers."
- **Length:** final draft, **23 pages**, **three chapters**: *Roz Ka Bojh* (The Weight of Every Day), *Pehli Baar* (The First Time), *Raat Ka Hisaab* (The Night's Account). Not four.
- **Story:** Veer, 21, a SKIT civil engineering student in Jagatpura, swallows every insult ("Okay."). His other self, **The Other**, wakes when Veer sleeps; Veer wakes with blood under his fingernails, having slept better than in months. **Veer and The Other are played by the same actor.**
- **Characters:**
  - **Ananya:** the friend who sees past his answers.
  - **Shekhar:** submits Veer's work under his own name, claps his shoulder too hard.
  - **The Old Man:** runs the chai stall and says "Kitne din se rok raha hai, beta." He also delivers the four-yuga speech and "Is yug mein koi avatar nahi utrega baahar se…"
- **Opening:** Kundanpura railway crossing, the Delhi–Jaipur line, a train that never arrives. **Ending:** the four yuga lines, the damru swells and cuts to silence, then "मैं।", then "उन दिनों रामनगरिया के आसपास हुई घटनाओं का कोई गवाह नहीं मिला। कोई संदिग्ध नहीं। सिर्फ — एक सवाल।" (Not used on the site yet; it is a strong teaser line if wanted.)
- **Production plan:**
  - 29 scenes mapped to real Jaipur locations (Kundanpura railway crossing, the SKIT campus road, scrubland, construction sites at night, residential corridors); a **seven-Sunday** shoot.
  - Shot on a **Sony a6100 with natural light only, no lighting kit**.
  - **Visual rule:** Veer's world gets warm, soft light; The Other gets one hard, cool source. The night "hunt" is lit by street lamps only.
- **Music:** a recurring **damru** motif and heavy drums; the original song **"Kalyug Charam"**.
- **Other films on the board** (placeholders in `content.js`; ask the owner for real details):
  - **HUMSAYA:** zero-VFX psychological horror
  - **Smriti** (स्मृति): non-linear supernatural mystery set in Uttarakhand
  - **Nanhni Muskan:** a thalassemia / stem-cell donation awareness drama

---

## 10. Research that shaped the site

Studied: A24, Blumhouse, Yash Raj Films, Somesuch, Nexus Studios, DNEG. Borrowed patterns:

- A one-line mission up front (YRF, Nexus): the manifesto.
- A24-style film credits, share and where-to-watch: the credits block and film actions.
- A journal / news feed (A24 Notes, "Life at DNEG"): Notes from the set.
- Ways in for collaborators (Nexus "Get in touch", DNEG "Join us"): the call sheet, Work with us, the contact form.
- A24's "not too often" email list: Letters from the set.
- DNEG's local time per studio: the live Jaipur clock and status.
- YRF and DNEG division structures: the four worlds.

---

## 11. Deploy checklist (still to do)

1. Replace `brand.email` and `brand.socials` in `content.js`.
2. In `index.html`, change the `og:image` and `twitter:image` meta tags to the **absolute live URL** of `assets/img/share-card.png`.
3. Deploy to Netlify from GitHub and finish the backend setup in `BACKEND.md` (desk user, disable sign-ups, secret key, three Netlify env vars; the tables already exist).
4. Add real assets as they exist: stills and storyboards (stage `media`), the founder photo, the AHAM poster, trailer and showreel embed URLs, and mp3 tracks.
5. **Portfolio collage** (`assets/img/portfolio-collage.webp`) contains another designer's text ("4+ years of experience…"). Replace it with the owner's own image.
6. Close the call sheet (`callsheet.open:false`) when AHAM is cast.
7. Optional: automatic email via Resend (see the end of `BACKEND.md`).

---

## 12. Working rules for Claude Code in this repo

- **Keep it dependency-free and build-free.** No frameworks, bundlers or npm packages in the shipped site. Everything must work by opening `index.html` on a static host.
- **Content goes in `content.js`**; don't hard-code film data in `main.js` or the HTML.
- **Respect sections 2 and 3.** Flat colours, the brand palette, the five fonts, cinematic motion. No gradient washes, no party effects in the AHAM section, no multicolour footer, no cursor circle.
- **Copy style:** plain, confident, sentence case; no filler; the owner's first-person voice ("I") on About, contact and journal. Don't invent facts about the owner or the films; ask.
- **Mobile matters:** test at 390px width. There must be **no horizontal overflow**: `document.documentElement.scrollWidth` must equal `innerWidth`. Rotated or tilted elements before their reveal have caused overflow before; `.making` uses `overflow-x: clip` for that reason.
- **Keep accessibility:** `prefers-reduced-motion` paths, visible `:focus-visible`, `aria` on dialogs and buttons, and `lang="hi"` on Devanagari.
- **Scroll locks must always release.** Any new locked moment has to call `Lock.unlock()` on every path.
- **Sound must stay optional.** Guard every call; never auto-play before the gate click.
- **CSS gotcha found before:** a broad find-and-replace once merged the `.poster {}` base rule into a hover selector, and the posters broke outside hover. After editing CSS, check the film board *without* hovering.
- **Pinned section heights** control pacing: `.hero` 290vh, `.manifesto` 300vh, `.yuga-pin` 520vh, `.contact-stage` 230vh, and the journal height is computed in JS.
- **Clapper timings** are in `initClapper() → run()`: write at 80 ms, arm at 1150, clap at 1650, iris at 2150, unlock at 3100, hide at 3350.
- **Known leftovers you can safely clean up:**
  - The CSS header comment still says "Light leak"; update it to "flat Rajasthan palette".
  - `initCursor()` in main.js is unused (the cursor was removed).
  - The `.orb`, `.orb-old` and `.dot` CSS in the yugas area is dead (the canvas replaced it).
  - `conceptHTML()` is only used by the film room for non-featured films.

### Testing approach used so far

Headless Chromium with Playwright:
- Serve the folder over HTTP (`python -m http.server`), because forms and relative paths behave differently over `file://`.
- Click `#enterSound` after about 2.3 s to pass the gate.
- Add `html{scroll-behavior:auto!important}` before scripted scrolling.
- Screenshot pinned sections at several scroll fractions of `(el.offsetHeight - innerHeight)`.
- Check `scrollWidth === innerWidth` and zero `pageerror` events at 1440×900 and 390×844.
- Google Fonts may be blocked in sandboxes; the `@fontsource/*` npm packages can be routed in locally for accurate screenshots.

---

## 13. History of this build, briefly

1. First build: a funky collage theme from three reference images (a dark chalkboard/clapperboard collage, a colourful animator portfolio, a torn-paper "PORTFOLIO" collage). The owner asked for the collage image to be a clickable link to his portfolio and for the films to be revealed by a clapperboard animation.
2. The owner found it too funky; the "Projection room" version followed, which he found boring; then "Light leak", whose gradients he disliked.
3. Flat Rajasthan palette plus a scroll-driven immersive rebuild: fly through the zero, word bands, full-screen yugas, colour-flooded sections.
4. The yugas became living realms, and a cinematic finale plus title wipes were added.
5. After the production-house research: manifesto, credits and share, numbers, call sheet, journal, services, Netlify forms, footer and newsletter, SEO, share card, 404.
6. Sound on by default via the entrance gate; the scroll lock during the clap.
7. The yuga reveal was reworked to be intense rather than a party; the footer became the particle wordmark; the cursor circle was removed.

A private preview has been published as a Claude artifact; the real deployment target is Netlify.

---

## 14. Backend: forms, database and the studio desk

Added 27 Sep 2026. Owner-facing setup and usage are in `BACKEND.md`.

- **Stack:** Netlify Functions v2 (`export default (req) => Response`, `config.path`), Supabase (Postgres via PostgREST, plus Supabase Auth for the desk login). **Resend is optional and off by default** (owner's choice, 27 Sep 2026): newsletters are sent from the owner's Gmail via the desk's copy-letter / copy-emails (Bcc) / open-Gmail / mark-as-sent steps. **No npm packages**: the functions use `fetch` and web-standard APIs only.
- **Endpoints:** `POST /api/contact`, `POST /api/subscribe` (both accept JSON, or urlencoded for no-JS posts, and have honeypots `company` / `website`), `/unsubscribe` (also `/api/unsubscribe`): without a token it asks for the email and answers the same either way; with `?t=<token>` GET confirms and POST does it (RFC 8058 one-click), `POST /api/desk {action}`, and the scheduled `keepalive` (daily).
- **Tables** (`supabase/schema.sql`): `enquiries` (status new/replied/done/spam, notes), `enquiry_replies`, `subscribers` (email unique, status, private `token`), `letters` (status draft/sent/partial, `updated_at`, `sent_at`; desk actions `letter.save`, `letter.mark_sent`, `letter.delete`). RLS is on with no policies, so only the secret key (server side) can read or write.
- **Desk auth:** `login` exchanges email and password with Supabase Auth; every other action verifies the bearer token via `/auth/v1/user` **and** that the email equals `ADMIN_EMAIL`. Sign-ups are disabled in Supabase.
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (new `sb_secret_` keys go only in `apikey`; legacy JWT keys also go in `Authorization`), `ADMIN_EMAIL`. Optional (Resend): `RESEND_API_KEY`, `NOTIFY_EMAIL`, and after a domain `MAIL_FROM`, `REPLY_TO`, `SITE_URL`. Supabase project ref `hlwzwsujxuyrzbzcibyt` (Tokyo); schema already applied. The owner's `.env` (gitignored) holds `SUPABASE_URI` for direct Postgres access.
- **Setup vs live mail:** `mailConfig().live` is true once `MAIL_FROM` isn't `@resend.dev`. Before that, only the owner's alerts and tests are sent; desk replies, acknowledgements, welcomes and letters are refused with a clear message, and the desk falls back to `mailto:`.
- **Safety rules:** escape every user value in the desk (`esc`) and in the emails (`esc` in `mail.mjs`); validate ids with `isId` before putting them in PostgREST filters; CSV export neutralises formula cells; `letter.send` requires `expect` to equal the live subscriber count and refuses the same subject within 15 minutes.
- **Desk UI** follows the site's palette and fonts (flat colours, Unbounded / Bricolage / Caveat for the "desk" mark). Status colours: new = rani, replied = peacock, done = outline, spam = grey. It must work at 390px with no horizontal overflow.
- **Testing without Node:** a module service worker can import the real function files and route `/api/*` to them, with `fetch` mocked for Supabase and Resend. That is how this was verified; the harness lives outside the repo.
- **Demo mode:** `desk.js` asks `/api/desk {action:"status"}` on load. If the backend isn't reachable or isn't configured (`ready:false`), it loads `desk/demo.js`, which answers every desk action from sample data in localStorage (login `demo@shunyaakar.test` / `shunyaakar-demo`). A demo session is dropped once the real backend is ready. Keep `demo.js` in step with new desk actions.
