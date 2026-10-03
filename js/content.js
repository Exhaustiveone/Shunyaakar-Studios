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
    email: "hello@shunyaakarstudios.in",
    portfolioUrl: "https://shunyaakar.netlify.app", // ← your personal portfolio
    portfolioImage: "",                       // ← e.g. "assets/img/portfolio-cover.jpg" (4:5). Empty shows a name card.
    whatsapp: "",                             // ← digits with country code, e.g. "919812345678". Empty hides WhatsApp.
    apiUrl: "https://shunyaakar-studios.onrender.com",   // ← the backend (Render). Forms post here when the site is opened from another host.
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
    stage: "Production",
    short: "AHAM, shooting · 60% shot",   // the one-line status in the hero viewfinder
    detail: "60% of the film is shot."
  },

  /* The manifesto. It lights up word by word as you scroll.
     Wrap a word in *stars* to give it a solid colour highlight. */
  manifesto:
    "Every story here begins at *zero*. A blank page. A real street. I write it, shoot it, *score* it and cut it myself, in *Jaipur*, and I leave the door open so you can watch it become *something*.",

  /* The production house's divisions ("worlds").
     status: "live" or "soon". Add a new one when a vertical opens. */
  divisions: [
    {
      name: "Films",
      status: "live",
      tone: "brass",
      text: "Short films written, shot and cut in-house. AHAM is shooting now, 60% in the can.",
      link: "#films",
      linkText: "See the films"
    },
    {
      name: "Music",
      status: "live",
      tone: "brass-2",
      text: "Original songs, scores and sound design. AHAM's music is made with Genvox Studio.",
      link: "#music",
      linkText: "Hear the sound"
    },
    {
      name: "VFX",
      status: "soon",
      tone: "steel",
      text: "Compositing and invisible effects, built first for my own films.",
      stage: "Planned"
    },
    {
      name: "Animation",
      status: "soon",
      tone: "steel-2",
      text: "2D and motion work for stories that can't be shot on a camera.",
      stage: "Planned"
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
      status: "Production",
      accent: "#FF3D8B", accent2: "#FFB224",
      poster: "",                         // ← "assets/img/aham/poster.jpg"
      tagline: "A film about the self that hides, and the self that answers.",
      logline:
        "Veer, 21, a civil engineering student in Jagatpura, swallows every insult with a smile. Then he starts waking up exhausted, with blood under his nails, and the morning news starts matching his dreams.",
      note: "My first film. Shot around SKIT and Jagatpura.",
      trailer: "",                        // ← YouTube embed link for the teaser/trailer
      /* Where to watch: add { label: "YouTube", url: "https://..." } when it's out */
      watch: [],
      release: "Festivals first, then online",
      credits: [
        { role: "Written and directed by", name: "Mayank Sharma" },
        { role: "Cinematography and edit", name: "Mayank Sharma" },
        { role: "Music and songs", name: "Shunyaakar Sound with Genvox Studio" },
        { role: "Language", name: "Hindi" },
        { role: "Shot in", name: "Jagatpura and Ramnagariya, Jaipur" },
        { role: "Light", name: "Available light, shaped on location" }
      ],
      /* AHAM in numbers (counts up on screen). "from" makes it count down. */
      numbers: [
        { value: 23, label: "pages in the final draft" },
        { value: 29, label: "scenes, each with a real Jaipur address" },
        { value: 7, label: "Sundays to shoot the whole film" },
        { value: 2, label: "worlds of light, one warm, one cold" },
        { value: 0, from: 29, label: "sets built: every scene is a real place" }
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
          status: "done",
          when: "Shoot planned",
          summary:
            "29 scenes mapped to real locations around Jagatpura and SKIT, a seven-Sunday shoot calendar, and a lighting language built from what each place already has: windows, sunlight and the city's own lamps.",
          notes: [
            "Veer's world: warm, soft light",
            "The Other: one hard, cool source"
          ],
          media: [
            { type: "image", src: "", caption: "Location recce: railway crossing" },
            { type: "image", src: "", caption: "Lighting breakdown, scene 14" },
            { type: "image", src: "", caption: "Storyboards" }
          ]
        },
        {
          name: "Production",
          status: "rolling",
          when: "Shooting now",
          progress: 60,                   // ← % of the film shot; shown as a meter
          summary:
            "Shot where the story actually happens, in the light those places already have: the railway crossing, the campus, the scrubland off Vatika Road, half-built sites at night.",
          notes: ["The night hunt: lit by Jaipur's street lamps"],
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
          notes: ["Original song: Kalyug Charam", "Music with Genvox Studio"],
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
      /* The people of AHAM. Each card opens a profile.
         photo: "assets/img/aham/veer.jpg"  (portrait works best, about 4:5)
         actor: who plays them, about: a few lines about the actor or character */
      cast: [
        { name: "Veer", role: "The one who stays quiet", note: "21, civil engineering student. Types 'Okay.' when he means everything else.", actor: "", photo: "", about: "" },
        { name: "The Other", role: "The one who answers", note: "Wakes when Veer sleeps. Steady in a way that is worse than speed.", actor: "", photo: "", about: "" },
        { name: "Ananya", role: "The one who sees", note: "Knows him well enough to look past his answers.", actor: "", photo: "", about: "" },
        { name: "The Old Man", role: "The one who knows", note: "Runs a chai stall that seems older than the road.", actor: "", photo: "", about: "" },
        { name: "Shekhar", role: "The one who takes", note: "Submits Veer's work under his own name. Every time.", actor: "", photo: "", about: "" }
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
      logline: "A horror film built on the Qareen, the companion every person is given at birth. Made entirely in camera, with sound doing the haunting.",
      note: "Fear made with nothing but light and timing.",
      stages: [
        { name: "Script", status: "rolling", when: "Drafting", summary: "Built on jinn mythology, with almost no dialogue: the fear lives in the sound design, not in effects.", notes: [], media: [] },
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
      status: "Script ready",
      accent: "#13C2B0", accent2: "#4B63FF",
      poster: "",
      logline: "Arjun, an ancient banyan tree, and a memory that is being erased. A non-linear supernatural mystery set in the hills of Uttarakhand.",
      note: "Told out of order, on purpose.",
      stages: [
        { name: "Script", status: "done", when: "Screenplay complete", summary: "Every scene has a visual reference, and the shoot is planned across Roorkee, Haridwar, Rishikesh and Lansdowne.", notes: [], media: [] },
        { name: "Pre-production", status: "next", when: "Nine weekends planned", summary: "", notes: [], media: [] },
        { name: "Production", status: "next", when: "", summary: "", notes: [], media: [] },
        { name: "Post-production", status: "next", when: "", summary: "", notes: [], media: [] }
      ]
    },
    {
      id: "nanhi-muskaan",
      title: "Nanhi Muskaan",
      year: "In development",
      genre: "Drama, awareness",
      status: "Writing",
      accent: "#FFB224", accent2: "#13C2B0",
      poster: "",
      logline: "A student keeps seeing a small girl in a red dress. She leads him to a thalassemia ward and a donor register.",
      note: "A film with a job to do.",
      stages: [
        { name: "Script", status: "rolling", when: "Beat board", summary: "An 18-minute Hinglish drama about thalassemia and stem-cell donation, being reworked for festivals.", notes: [], media: [] },
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
      body: "Veer lives in warm, soft light. The Other only ever gets one hard, cold source. Both are built from what each location already has: a window, a reflector, a street lamp. Light you find looks like it belongs there.",
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
      body: "The Other's night scenes are lit by Jaipur itself: sodium lamps, passing headlights, a shop shutter half open. Where the frame goes dark, it is meant to.",
      image: ""
    }
  ],

  /* ------------------------------------------------------------------
     CALL SHEET — open roles for the current film.
     Set open: false to hide the whole section once you're cast.
     ------------------------------------------------------------------ */
  callsheet: {
    open: true,
    film: "Nanhi Muskaan",
    where: "Jaipur",
    when: "Dates to be announced",
    status: "Casting",
    roles: [
      { role: "Child artist", who: "A young actor for a central role. Natural on camera, comfortable in Hindi, with a parent or guardian on set.", type: "Cast" },
      { role: "Female vocalist", who: "A voice for the film's song. Send a recording of anything you've sung.", type: "Music" }
    ]
  },

  /* ------------------------------------------------------------------
     WORK WITH US — services. "type" must match an option in the
     contact form so clicking a row pre-fills it.
     ------------------------------------------------------------------ */
  services: [
    { title: "Short and branded films", text: "Your story written, shot, edited and graded by one team, from the first draft to the final file.", type: "Short or branded film", tone: "rani" },
    { title: "Music videos", text: "A visual concept built around your song, then shot and cut to its rhythm.", type: "Music video", tone: "marigold" },
    { title: "Cinematography", text: "Camera and lighting for your shoot, planned shot by shot before the day.", type: "Cinematography", tone: "peacock" },
    { title: "Edit and colour", text: "Your footage cut for rhythm and story, with a grade that gives it one consistent look.", type: "Edit and colour", tone: "royal" },
    { title: "Photography", text: "Portraits, spaces, products and night work, edited and delivered ready to post.", type: "Photography", tone: "rani" }
  ],

  /* ------------------------------------------------------------------
     HOW I SHOOT — shown under the service rows in "Work with us"
     ------------------------------------------------------------------ */
  method: {
    title: "Small crew. Real light. Every frame planned.",
    line: "I don't bring a studio into your place. I make your place the studio.",
    points: [
      { title: "A small crew", text: "Fits into a working cafe, shop or set without taking it over, sets up fast, and leaves the place as it found it." },
      { title: "Light designed for the place", text: "I start with the light your space already has, then add only what the frame needs, so on screen it still looks like your place." },
      { title: "Every frame planned", text: "Shot list and lighting plan are ready before the shoot day, so the day itself moves fast and nothing important is missed." }
    ]
  },

  /* ------------------------------------------------------------------
     SHUNYAAKAR SOUND — the music division and its collaborators
     ------------------------------------------------------------------ */
  sound: {
    intro: "Songs, scores and sound design written for the story, never pulled from a library. The music and songs of AHAM are made in collaboration with Genvox Studio.",
    collab: {
      film: "AHAM",
      name: "Genvox Studio",
      founder: "Uday Singh Sisodia",
      text: "AHAM's soundtrack, from the damru motif to the original song Kalyug Charam, is composed and produced together with Genvox Studio."
    }
  },

  /* ------------------------------------------------------------------
     MUSIC — tracks
     src:   "assets/audio/kalyug-charam.mp3" when you have a file
     synth: "damru" plays the built-in damru pattern (no file needed)
     ------------------------------------------------------------------ */
  tracks: [
    { title: "Kalyug Charam", meta: "Original song for AHAM, with Genvox Studio", status: "Writing", src: "" },
    { title: "Damru Theme", meta: "AHAM score, with Genvox Studio", status: "Sketch", src: "", synth: "damru" },
    { title: "The Night's Account", meta: "AHAM score, hunt cue, with Genvox Studio", status: "Planned", src: "" }
  ]
};
