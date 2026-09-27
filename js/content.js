/* =====================================================================
   SHUNYAAKAR — SITE CONTENT
   ---------------------------------------------------------------------
   This is the only file you need to touch to update the website.
   Everything on the page (films, stages, photos, tracks, links) is
   rendered from this object by js/main.js.

   Photos  → put them in assets/img/ and write the path, e.g.
             src: "assets/img/aham/storyboard-01.jpg"
   Audio   → put mp3 files in assets/audio/ and set src on a track.
   Video   → use a YouTube/Vimeo EMBED link, e.g.
             "https://www.youtube.com/embed/VIDEO_ID"
   Leave any src as "" and the site shows a clean placeholder frame.
   ===================================================================== */

window.SITE = {
  brand: {
    name: "Shunyaakar",
    founder: "Mayank Sharma",
    location: "Jaipur, Rajasthan",
    email: "hello@shunyaakar.com",            // ← replace with your real email
    portfolioUrl: "https://shunyaakar.netlify.app", // ← your personal portfolio
    showreelUrl: "",                          // ← YouTube embed link when ready
    founderPhoto: "",                         // ← e.g. "assets/img/mayank.jpg"
    replyTime: "within two days",
    timezone: "Asia/Kolkata",                 // drives the live Jaipur clock
    socials: [
      { label: "Instagram", url: "https://instagram.com/" },
      { label: "YouTube",   url: "https://youtube.com/" },
      { label: "LinkedIn",  url: "https://linkedin.com/" }
    ]
  },

  /* What the studio is doing right now. Shown in the hero viewfinder,
     the footer and the call sheet. Update it as the film moves on. */
  status: {
    film: "AHAM",
    stage: "Pre-production",
    detail: "Storyboards next, then seven Sundays of shooting."
  },

  /* The manifesto. It lights up word by word as you scroll.
     Wrap a word in *stars* to give it a solid colour highlight. */
  manifesto:
    "Every story here begins at *zero*. A blank page. One camera. No lights. We write it, shoot it, *score* it and cut it ourselves, in *Jaipur*, and we leave the door open so you can watch it become *something*.",

  /* The production house's divisions ("worlds").
     status: "live" or "soon". Add a new one when a vertical opens. */
  divisions: [
    {
      name: "Films",
      status: "live",
      tone: "brass",
      text: "Short films written, shot and cut in-house. AHAM is in pre-production now.",
      link: "#films",
      linkText: "See the films"
    },
    {
      name: "Music",
      status: "live",
      tone: "brass-2",
      text: "Original songs, scores and sound design, starting with the soundtrack of AHAM.",
      link: "#music",
      linkText: "Hear the sound"
    },
    {
      name: "VFX",
      status: "soon",
      tone: "steel",
      text: "Compositing and invisible effects, built first for our own films.",
      progress: 15
    },
    {
      name: "Animation",
      status: "soon",
      tone: "steel-2",
      text: "2D and motion work for stories that can't be shot on a camera.",
      progress: 5
    }
  ],

  /* ------------------------------------------------------------------
     FILMS
     featured: true → gets the big "Making of" section on the home page.
     Stage status: "done" | "rolling" | "next"
     media: [{ type: "image", src: "", caption: "" }]
            [{ type: "video", src: "https://www.youtube.com/embed/..", caption: "" }]
     ------------------------------------------------------------------ */
  films: [
    {
      id: "aham",
      featured: true,
      title: "AHAM",
      devanagari: "अहम्",
      year: "2026",
      genre: "Mythological, psychological",
      status: "Pre-production",
      accent: "#FF3D8B", accent2: "#FFB224",
      poster: "",                         // ← "assets/img/aham/poster.jpg"
      tagline: "A film about the self that hides, and the self that answers.",
      logline:
        "Veer, 21, a civil engineering student in Jagatpura, swallows every insult with a smile. Then he starts waking up exhausted, with blood under his nails, and the morning news starts matching his dreams.",
      note: "Our first film. Shot around SKIT and Jagatpura.",
      trailer: "",                        // ← YouTube embed link for the teaser/trailer
      /* Where to watch: add { label: "YouTube", url: "https://..." } when it's out */
      watch: [],
      release: "Festivals first, then online",
      credits: [
        { role: "Written and directed by", name: "Mayank Sharma" },
        { role: "Cinematography and edit", name: "Mayank Sharma" },
        { role: "Music", name: "Shunyaakar Sound" },
        { role: "Language", name: "Hindi" },
        { role: "Shot in", name: "Jagatpura and Ramnagariya, Jaipur" },
        { role: "Camera", name: "Sony a6100, natural light" }
      ],
      /* AHAM in numbers (counts up on screen). "from" makes it count down. */
      numbers: [
        { value: 23, label: "pages in the final draft" },
        { value: 29, label: "scenes, each with a real Jaipur address" },
        { value: 7, label: "Sundays to shoot the whole film" },
        { value: 1, label: "camera" },
        { value: 0, from: 12, label: "lighting kits" }
      ],
      stages: [
        {
          name: "Script",
          status: "done",
          when: "Final draft locked",
          summary:
            "Twenty-three pages in three chapters: Roz Ka Bojh (the weight of every day), Pehli Baar (the first time) and Raat Ka Hisaab (the night's account). The mythological spine: in every yuga good and evil draw closer, until in Kaliyug they share a single body.",
          excerpt: {
            text:
              "Is yug mein koi avatar nahi utrega baahar se, tujhe bachaane. Aur koi rakshas bhi nahi aayega baahar se, tujhe maarne. Kyunki woh baahar hai hi nahi.",
            source: "The Old Man, chai stall, evening"
          },
          notes: [
            "Veer's inner voice runs as V.O.",
            "The damru is written into the script",
            "Tagline found on page one"
          ],
          media: [
            { type: "image", src: "", caption: "Script pages and margin notes" },
            { type: "image", src: "", caption: "Sketchpad: the figure in the fire" }
          ]
        },
        {
          name: "Pre-production",
          status: "rolling",
          when: "Planning the shoot",
          summary:
            "29 scenes mapped to real locations around Jagatpura and SKIT, a seven-Sunday shoot calendar, and a lighting language designed for zero budget.",
          notes: [
            "Veer's world: warm, soft light",
            "The Other: one hard, cool source",
            "Storyboards up next"
          ],
          media: [
            { type: "image", src: "", caption: "Location recce: railway crossing" },
            { type: "image", src: "", caption: "Lighting breakdown, scene 14" },
            { type: "image", src: "", caption: "Storyboards" }
          ]
        },
        {
          name: "Production",
          status: "next",
          when: "Seven Sundays",
          summary:
            "Shot on a Sony a6100 with natural light, reflectors and whatever the street lamps give us: the railway crossing, the campus, the scrubland off Vatika Road, half-built sites at night.",
          notes: ["The night hunt: street light only"],
          media: [
            { type: "image", src: "", caption: "Behind the scenes" },
            { type: "image", src: "", caption: "On set" }
          ]
        },
        {
          name: "Post-production",
          status: "next",
          when: "Edit, grade, sound",
          summary:
            "Two colour worlds in the grade, a damru that keeps returning in the sound design, and an original score that mixes mythology with heavy drums.",
          notes: ["Original song: Kalyug Charam"],
          media: [{ type: "image", src: "", caption: "Edit timeline" }]
        },
        {
          name: "Release",
          status: "next",
          when: "Festivals, then everyone",
          summary: "A festival run first, followed by a public premiere online.",
          notes: [],
          media: []
        }
      ],
      /* Optional: the four-yuga idea shown as an interlude */
      concept: {
        title: "The idea underneath",
        intro: "In every yuga, good and evil draw closer. By Kaliyug there is no world, no sea, no wall left between them.",
        lines: [
          { deva: "सत्ययुग में — देव और असुर अलग लोक में थे।", gloss: "Satyug: gods and demons lived in separate worlds.", gap: 86 },
          { deva: "त्रेतायुग में — एक ही धरती पर।", gloss: "Treta: on the same earth.", gap: 58 },
          { deva: "द्वापरयुग में — एक ही घर में।", gloss: "Dwapar: in the same house.", gap: 28 },
          { deva: "कलियुग में — एक ही शरीर में।", gloss: "Kaliyug: in the same body.", gap: 0 }
        ],
        final: "मैं।"
      },
      cast: [
        { name: "Veer", role: "The one who stays quiet", note: "21, civil engineering student. Types 'Okay.' when he means everything else.", actor: "" },
        { name: "The Other", role: "The one who answers", note: "Wakes when Veer sleeps. Steady in a way that is worse than speed.", actor: "" },
        { name: "Ananya", role: "The one who sees", note: "Knows him well enough to look past his answers.", actor: "" },
        { name: "The Old Man", role: "The one who knows", note: "Runs a chai stall that seems older than the road.", actor: "" },
        { name: "Shekhar", role: "The one who takes", note: "Submits Veer's work under his own name. Every time.", actor: "" }
      ]
    },
    {
      id: "humsaya",
      title: "HUMSAYA",
      year: "In development",
      genre: "Psychological horror, zero VFX",
      status: "Writing",
      accent: "#4B63FF", accent2: "#FF3D8B",
      poster: "",
      logline: "A horror film built entirely in camera: no VFX, only what the frame refuses to show.",
      note: "Fear made with nothing but light and timing.",
      stages: [
        { name: "Script", status: "rolling", when: "Drafting", summary: "Story details coming soon." /* ← write the real summary here */, notes: [], media: [] },
        { name: "Pre-production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Post-production", status: "next", when: "", summary: "", notes: [], media: [] }
      ]
    },
    {
      id: "smriti",
      title: "Smriti",
      devanagari: "स्मृति",
      year: "In development",
      genre: "Supernatural mystery",
      status: "Writing",
      accent: "#13C2B0", accent2: "#4B63FF",
      poster: "",
      logline: "A non-linear supernatural mystery set in the hills of Uttarakhand.",
      note: "Told out of order, on purpose.",
      stages: [
        { name: "Script", status: "rolling", when: "Drafting", summary: "Story details coming soon." /* ← write the real summary here */, notes: [], media: [] },
        { name: "Pre-production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Post-production", status: "next", when: "", summary: "", notes: [], media: [] }
      ]
    },
    {
      id: "nanhni-muskan",
      title: "Nanhni Muskan",
      year: "In development",
      genre: "Drama, awareness",
      status: "Writing",
      accent: "#FFB224", accent2: "#13C2B0",
      poster: "",
      logline: "A drama about thalassemia and the stranger whose stem cells can save a child.",
      note: "A film with a job to do.",
      stages: [
        { name: "Script", status: "rolling", when: "Beat board", summary: "Story details coming soon." /* ← write the real summary here */, notes: [], media: [] },
        { name: "Pre-production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Post-production", status: "next", when: "", summary: "", notes: [], media: [] }
      ]
    }
  ],

  /* ------------------------------------------------------------------
     NOTES FROM THE SET — the production diary.
     Newest first or oldest first, your call. Add a date if you like
     (e.g. "14 Sep 2026") and an image path to show a still.
     tag: "Script" | "Pre-production" | "Production" | "Post" | "Music"
     ------------------------------------------------------------------ */
  journal: [
    {
      tag: "Script",
      date: "",
      title: "The final draft is locked",
      body: "Twenty-three pages. The first thing you hear is a train on the Delhi–Jaipur line that never arrives. The last thing you read is a question nobody in Ramnagariya can answer.",
      image: ""
    },
    {
      tag: "Pre-production",
      date: "",
      title: "Two kinds of light",
      body: "Veer lives in warm, soft light. The Other only ever gets one hard, cold source. There's no lighting kit, so the rule has to work with windows, reflectors and street lamps.",
      image: ""
    },
    {
      tag: "Pre-production",
      date: "",
      title: "Twenty-nine scenes, seven Sundays",
      body: "Every scene now has a real address: the Kundanpura railway crossing, the SKIT campus road, the scrubland past Vatika Road, a half-built site at night. The whole shoot fits into seven Sundays.",
      image: ""
    },
    {
      tag: "Music",
      date: "",
      title: "The damru was written first",
      body: "It's in the script before it's recorded anywhere: one low beat at night, then building under the last lines of the film. Kalyug Charam grew out of that beat.",
      image: ""
    },
    {
      tag: "Production",
      date: "",
      title: "The hunt, by street light",
      body: "The Other's night scenes get whatever the street lamps give us. Nothing added. If the frame goes dark, the frame goes dark.",
      image: ""
    }
  ],

  /* ------------------------------------------------------------------
     CALL SHEET — open roles for the current film.
     Set open: false to hide the whole section once you're cast.
     ------------------------------------------------------------------ */
  callsheet: {
    open: true,
    film: "AHAM",
    where: "Jagatpura, Jaipur",
    when: "Sundays",
    roles: [
      { role: "Veer / The Other", who: "One actor, two selves. Early twenties, fluent in Hindi, can go from swallowed anger to total calm without a word.", type: "Cast" },
      { role: "Ananya", who: "Early twenties. The friend who sees past the answer to the thing underneath it.", type: "Cast" },
      { role: "Shekhar", who: "Early twenties. Loud, charming, takes the credit and claps you on the shoulder for it.", type: "Cast" },
      { role: "The Old Man", who: "Sixty or older. Runs a chai stall and talks like he's finishing someone else's sentence.", type: "Cast" },
      { role: "Sound recordist", who: "Someone with a boom and patience. Night exteriors, a lot of silence to protect.", type: "Crew" },
      { role: "Assistant director", who: "Keeps seven Sundays on schedule and the call sheet honest.", type: "Crew" },
      { role: "Grip and reflectors", who: "No lights on this film, so bouncing the sun is the whole job.", type: "Crew" }
    ]
  },

  /* ------------------------------------------------------------------
     WORK WITH US — services. "type" must match an option in the
     contact form so clicking a row pre-fills it.
     ------------------------------------------------------------------ */
  services: [
    { title: "Short and branded films", text: "Written, shot and cut end to end, from the first draft to the final grade.", type: "Short or branded film", tone: "rani" },
    { title: "Music videos", text: "A concept built around the song, then shot with whatever the song needs.", type: "Music video", tone: "marigold" },
    { title: "Cinematography", text: "A camera operator who thinks in light, especially when there isn't much of it.", type: "Cinematography", tone: "peacock" },
    { title: "Edit and colour", text: "Cutting for rhythm and feeling, with grades that give each world its own light.", type: "Edit and colour", tone: "royal" },
    { title: "Original music", text: "Songs, scores and sound design written for the picture, never pulled from a library.", type: "Music or score", tone: "marigold" },
    { title: "Photography", text: "Portraits, architecture, industry and night work.", type: "Photography", tone: "rani" }
  ],

  /* ------------------------------------------------------------------
     MUSIC — tracks
     src:   "assets/audio/kalyug-charam.mp3" when you have a file
     synth: "damru" plays the built-in damru pattern (no file needed)
     ------------------------------------------------------------------ */
  tracks: [
    { title: "Kalyug Charam", meta: "Original song for AHAM", status: "Writing", src: "" },
    { title: "Damru Theme", meta: "AHAM score, motif sketch", status: "Sketch", src: "", synth: "damru" },
    { title: "The Night's Account", meta: "AHAM score, hunt cue", status: "Planned", src: "" }
  ]
};
