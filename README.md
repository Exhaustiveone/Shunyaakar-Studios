# Shunyaakar — Production House Website

A static website (HTML + CSS + JS, no build step). Open `index.html` in a browser, or
use a live-server extension in Antigravity to preview while you edit.

## Folder structure

```
shunyaakar-studio/
├── index.html          page structure (sections, clapperboard markup)
├── css/style.css       all styling — colours and fonts are at the top in :root
├── js/content.js       ★ ALL YOUR CONTENT — edit this file most
├── js/main.js          behaviour: loader, portal, clapper, reel, music, overlays
└── assets/
    ├── img/            photos, posters, stills (portfolio-collage.webp is no longer used)
    ├── audio/          mp3 files for tracks
    └── video/          (optional) local video files
```

## Before you go live (5 minutes)

1. `js/content.js` → `brand.email` and `brand.socials`: your real email and profile links.
2. `index.html`, near the top → change the two `og:image` lines to your full live address
   (e.g. `https://your-site.onrender.com/assets/img/share-card.png`) so link previews show the card.
3. Deploy on Render: follow **[backend/README.md](backend/README.md)** (about 10 minutes).
   Contact enquiries and "Letters from the set" sign-ups are stored in Supabase and show up in
   your private desk at `/desk/`.
4. When AHAM is fully cast, set `callsheet.open: false` to hide the casting call.

## Everyday edits (all in `js/content.js`)

| Want to…                         | Change                                                        |
|----------------------------------|---------------------------------------------------------------|
| Set your email / socials         | `brand.email`, `brand.socials` (a social shows only once its URL points to your profile, e.g. `https://instagram.com/yourname`) |
| Turn on WhatsApp                 | `brand.whatsapp` → digits with country code, e.g. `"919812345678"` |
| Portfolio cover image            | `brand.portfolioImage` → `"assets/img/portfolio-cover.jpg"` (4:5); empty shows a name card |
| "How I shoot" block              | `method` (title, line, three points)                          |
| Link your personal portfolio     | `brand.portfolioUrl`                                          |
| Add your showreel                | `brand.showreelUrl` → `"https://www.youtube.com/embed/VIDEO_ID"` |
| Add your photo in About          | `brand.founderPhoto` → `"assets/img/mayank.jpg"`              |
| Add a film poster                | `poster: "assets/img/aham/poster.jpg"`                        |
| Move a stage forward             | `status: "next"` → `"rolling"` → `"done"`                     |
| Add a still / BTS photo          | in a stage's `media`: `{ type: "image", src: "assets/img/aham/bts-01.jpg", caption: "..." }` |
| Add a video to a stage           | `{ type: "video", src: "https://www.youtube.com/embed/...", caption: "..." }` |
| Add a cast member's name         | `cast[].actor`                                                |
| Add a song                       | `tracks[].src: "assets/audio/kalyug-charam.mp3"`              |
| Open a new division (VFX etc.)   | `divisions[].status: "live"` and add a `link`                 |
| Add a new film                   | copy one film object in `films` and change its `id`           |
| Update "what we're doing now"    | `status` (shown in the hero, call sheet, contact and footer)  |
| Write a diary entry              | add an object to `journal` (tag, date, title, body, image)    |
| Add a trailer                    | film → `trailer: "https://www.youtube.com/embed/..."`         |
| Add where to watch               | film → `watch: [{ label: "YouTube", url: "https://..." }]`    |
| Edit credits                     | film → `credits` (role/name pairs)                            |
| Change the big numbers           | film → `numbers`                                              |
| Open or close casting            | `callsheet.open`, `callsheet.roles`                           |
| Change what you offer            | `services` (type must match a form option in `index.html`)    |
| Rewrite the manifesto            | `manifesto` (wrap a word in *stars* to highlight it)          |

Only one film should have `featured: true` — it gets the big "Making of" section.
Clicking any other film opens its own full-screen process room.

## Colours & fonts

Theme: flat, solid Rajasthan colours — no gradients. Tokens at the top of `css/style.css`:

- `--ink` #0E0A1C background · `--bone` #F6F0E6 text
- `--rani` #FF3D8B (films, contact section) · `--marigold` #FFB224 (music, buttons, portfolio section)
- `--peacock` #13C2B0 (done / VFX) · `--royal` #4B63FF (The Other / animation); the music section uses #3346E0
- Fonts (Google Fonts): Unbounded (headings), Bricolage Grotesque (text),
  Caveat (handwritten notes and the slate), Courier Prime (script pages),
  Rozha One (all Hindi / Devanagari).

## The scroll experiences

- **Hero** (`initPortal` in `js/main.js`): the section is 290vh tall and pinned; scrolling flies the
  camera through the zero ring, the letters of the wordmark scatter, and "Every story starts at zero."
  appears. Change the height in `.hero { height: 290vh; }` to make the flight longer or shorter.
- **Word bands** (`.band`, `data-speed` in `index.html`): move sideways with scroll.
- **Film spine**: the marigold line in the making-of fills as you scroll through the stages.
- **Four yugas** (`initRealms` + `yugaScroll`): pinned full-screen and drawn live on a canvas. Dev is a calm
  golden yantra; asura is cold blue smoke with a fractured crown around a red slit eye. Each new yuga lands on a
  damru beat, and strands of light and smoke pull the realms together. At Kaliyug they become one body torn down
  the middle by a seam of fire. Then, as in the script's ending: both implode, the damru swells and cuts to
  silence, a third eye opens, and "मैं।" ignites inside a ring of fire with the film's tagline beneath.
  Height: `.yuga-pin { height: 520vh; }`.
- **Section titles**: a solid colour bar wipes across and the letters flip up in 3D (`.tw`, colour per
  section via `--wipe`).
- **Finale** (`initFinale`): the contact section floods pink from a circle, each word flies in from in front
  of the lens, then the ring draws itself around "zero". Height: `.contact-stage { height: 230vh; }`.
- **Manifesto** (`initManifesto`): pinned; each word lights up as you scroll and starred words get a solid colour block. Height: `.manifesto { height: 300vh; }`.
- **Notes from the set** (`renderJournal`): on desktop the cards move sideways as you scroll down; on phones you swipe.
- **Sound** starts off. The film-leader countdown (3, 2, 1) plays and opens the site by itself, silently;
  the speaker button turns sound on (the tanpura drone, damru, clap). The countdown is skipped on repeat
  visits in the same tab and with reduced motion. Sound pauses when the tab is hidden.

## Clapperboard timing

In `js/main.js` → `initClapper()` → `run()`: writing starts at 80 ms, the arm lifts at
1150 ms, the clap lands at 1650 ms, the iris closes at 2150 ms. The slate's timecode runs at 24 fps and freezes on the clap. Change those numbers
to speed up or slow down the sequence. When the clap starts, the page glides the slate into place and
holds the scroll still until the iris opens (unlocks at 3100 ms, `Lock.unlock()` in `run()`).
If a visitor jumps past the films with a menu link, the films are simply shown without the clap.

## Page order

Hero (fly through the zero) → word bands → manifesto → divisions → films (clapperboard) →
making of AHAM (credits, share, stages, numbers, the two realms, characters, call sheet) →
notes from the set → music → work with us → portfolio → about → contact (finale + form) → footer
(letters sign-up, live Jaipur clock, and SHUNYAAKAR assembled from the particles of the opening zero;
move the cursor over it and the grains scatter and settle back).

Share links: any film except the featured one opens directly with `#film-<id>`,
e.g. `your-site.onrender.com/#film-humsaya`. The featured film links to `#making`.

`404.html` is the "This scene was cut" page; the backend serves it for any unknown address.

## Deploy

The whole site runs on **Render** from the GitHub repo: one Node service (in `backend/`) serves
the pages, the forms and the desk. Every push to `main` goes live. Setup: [backend/README.md](backend/README.md).
Opened locally with Live Server, the pages work and the contact form falls back to opening your
email app; `/desk` shows a demo with sample data.

## Image tips

Export stills at ~1600 px wide as `.webp` or `.jpg` (quality ~80) to keep the site fast.
