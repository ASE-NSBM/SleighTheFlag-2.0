/**
 * ─────────────────────────────────────────────────────────────────────────
 *  SLEIGH THE FLAG 2.0 — single source of truth for everything on the site.
 *
 *  Edit this file to change dates, team size, copy, prizes, rules, FAQ and
 *  organiser details. Nothing here needs a database or a redeploy of data —
 *  just rebuild / restart.
 *
 *  Values marked  ⚠ PLACEHOLDER  were invented so the site has something to
 *  show. Confirm or replace them before you go live.
 * ─────────────────────────────────────────────────────────────────────────
 */
import type { SpriteName } from "@/components/ui/sprites";

/** All dates are written in Sri Lanka time (+05:30). */
export const TIMEZONE = "Asia/Colombo";

export const event = {
  name: "Sleigh The Flag",
  edition: "2.0",
  fullName: "Sleigh The Flag 2.0",
  kicker: "Inter-university Capture The Flag",
  tagline:
    "The North Pole has been breached. Gather your crew, crack the challenges and sleigh every flag before the snow settles.",
  description:
    "Sleigh The Flag 2.0 is a Christmas-season Capture The Flag competition organised by the Association of Software Engineering (ASE) of NSBM Green University. Register your team and take on web, crypto, reversing, forensics and more.",

  /** ⚠ PLACEHOLDER — confirm every date. */
  dates: {
    registrationOpens: "2026-11-20T00:00:00+05:30",
    registrationCloses: "2026-12-12T23:59:00+05:30",
    briefing: "2026-12-14T19:00:00+05:30",
    // The competition day — 15 December 2026 — is confirmed by the organisers.
    // The start/end times, the briefing and the registration deadline are still placeholders.
    eventStart: "2026-12-15T09:00:00+05:30",
    eventEnd: "2026-12-15T21:00:00+05:30",
    awards: "2026-12-15T21:30:00+05:30",
  },

  /** ⚠ PLACEHOLDER — format & venue. */
  format: "Jeopardy-style CTF",
  venue: "To be announced",

  /** ⚠ PLACEHOLDER — team size limits (leader included). */
  team: {
    minSize: 2,
    maxSize: 4,
  },

  /** Reject Gmail / Yahoo / Outlook… and insist on a university inbox. */
  requireUniversityEmail: true,

  /** Shown on the confirmation ticket and in exports. */
  codePrefix: "STF",

  /** Shown next to "flag format" in the About section. */
  flagFormat: "STF{c4ptur3_th3_fl4g}",
} as const;

/* ───────────────────────────── Organiser ──────────────────────────────── */
/* Taken from ASE's own GreenExE 4.0 site (greenexe-4.asensbm.live).        */

export const organizer = {
  name: "Association of Software Engineering",
  shortName: "ASE",
  university: "NSBM Green University",
  motto: "Empowering Future Innovators",
  about:
    "The official organising body representing Software Engineering undergraduates at NSBM Green University — building a community that learns by making, breaking and shipping.",
  vision:
    "To be the leading student organisation that nurtures innovation and technical excellence among Software Engineering undergraduates.",
  mission:
    "To create an inclusive community that bridges academia and industry through meaningful events, workshops and competitions.",
  logo: "/ase-logo.jpg",
  email: "ase@nsbm.ac.lk",
  phone: "+94 71 872 9888",
  phoneHref: "tel:+94718729888",
  address: "NSBM Green University, Mahenwatta, Pitipana, Homagama, Sri Lanka",
  mapUrl: "https://maps.google.com/?q=NSBM+Green+University",
  socials: [
    { label: "LinkedIn", handle: "asensbm", url: "https://www.linkedin.com/company/asensbm", sprite: "link" },
    { label: "Facebook", handle: "ase.nsbm", url: "https://www.facebook.com/ase.nsbm/", sprite: "link" },
    { label: "Instagram", handle: "@ase.nsbm", url: "https://www.instagram.com/ase.nsbm/", sprite: "link" },
  ] satisfies { label: string; handle: string; url: string; sprite: SpriteName }[],
  /**
   * Event coordinators shown in the contact block. Left empty on purpose —
   * add the people who should be reachable for THIS event.
   *   { name: "…", role: "Event Coordinator", phone: "+94 …", email: "…" }
   */
  contacts: [] as { name: string; role: string; phone?: string; email?: string }[],
} as const;

/* ─────────────────────────────── Sections ─────────────────────────────── */

export interface NavItem {
  id: string;
  label: string;
  hint: string;
  sprite: SpriteName;
}

/** Order here = order on the page, in the hotbar and for the 1–9 keys. */
export const nav: NavItem[] = [
  { id: "spawn", label: "Spawn", hint: "Back to the top", sprite: "cabin" },
  { id: "about", label: "About", hint: "What is Sleigh The Flag?", sprite: "book" },
  { id: "realms", label: "Realms", hint: "Challenge categories", sprite: "pickaxe" },
  { id: "quests", label: "Timeline", hint: "Key dates", sprite: "clock" },
  { id: "loot", label: "Loot", hint: "Prizes", sprite: "chest" },
  { id: "rules", label: "Rules", hint: "Rules & eligibility", sprite: "scroll" },
  { id: "register", label: "Register", hint: "Register your team", sprite: "flag" },
  { id: "faq", label: "FAQ", hint: "Questions & answers", sprite: "sign" },
  { id: "guild", label: "ASE", hint: "The organisers", sprite: "tree" },
];

export const highlights: { label: string; value: string; sprite: SpriteName }[] = [
  { label: "Format", value: event.format, sprite: "flag" },
  { label: "Team size", value: `${event.team.minSize}–${event.team.maxSize} players`, sprite: "party" },
  { label: "Open to", value: "University undergraduates", sprite: "cap" },
  { label: "Venue", value: event.venue, sprite: "pin" },
];

/** ⚠ PLACEHOLDER — typical CTF categories; trim or rename to match the real challenge set. */
export const realms: {
  name: string;
  category: string;
  blurb: string;
  sprite: SpriteName;
  accent: "berry" | "pine" | "gold" | "ice" | "violet";
  difficulty: 1 | 2 | 3;
}[] = [
  {
    name: "The Workshop Net",
    category: "Web Exploitation",
    blurb: "Santa's order system is live on the internet. Somebody forgot to sanitise the wish list.",
    sprite: "web",
    accent: "ice",
    difficulty: 2,
  },
  {
    name: "Frozen Ciphers",
    category: "Cryptography",
    blurb: "Letters to the North Pole, locked in ice. Break the cipher, read the mail.",
    sprite: "key",
    accent: "gold",
    difficulty: 3,
  },
  {
    name: "Clockwork Lab",
    category: "Reverse Engineering",
    blurb: "The toy machines run on compiled secrets. Take them apart gear by gear.",
    sprite: "gear",
    accent: "violet",
    difficulty: 3,
  },
  {
    name: "Chimney Breach",
    category: "Binary Exploitation",
    blurb: "One overflow away from the fireplace. Smash the stack, slide down the chimney.",
    sprite: "bomb",
    accent: "berry",
    difficulty: 3,
  },
  {
    name: "Snowprints",
    category: "Forensics",
    blurb: "Every intruder leaves tracks in fresh snow. Dig through dumps, logs and captures.",
    sprite: "lens",
    accent: "ice",
    difficulty: 2,
  },
  {
    name: "North Star Recon",
    category: "OSINT",
    blurb: "No exploit needed — only patience, a search bar and a very sharp eye.",
    sprite: "eye",
    accent: "pine",
    difficulty: 1,
  },
  {
    name: "Santa's Sack",
    category: "Misc & Steganography",
    blurb: "Odd shapes, strange files and gifts wrapped in gifts. Shake before opening.",
    sprite: "gift",
    accent: "berry",
    difficulty: 1,
  },
];

export const timeline: { title: string; at: string; note: string; sprite: SpriteName }[] = [
  {
    title: "Registration opens",
    at: event.dates.registrationOpens,
    note: "Gather your crew and claim a team name before someone else does.",
    sprite: "sign",
  },
  {
    title: "Registration closes",
    at: event.dates.registrationCloses,
    note: "Last call. Teams are verified against university email and student ID.",
    sprite: "lock",
  },
  {
    title: "Team briefing",
    at: event.dates.briefing,
    note: "Rules walkthrough, platform access and a warm-up challenge for team leaders.",
    sprite: "book",
  },
  {
    title: "The hunt begins",
    at: event.dates.eventStart,
    note: "Challenges unlock. Every solve drops a flag, every flag moves the scoreboard.",
    sprite: "flag",
  },
  {
    title: "Scoreboard freezes",
    at: event.dates.eventEnd,
    note: "Final submissions. No more flags after the bell.",
    sprite: "snowflake",
  },
  {
    title: "Awards",
    at: event.dates.awards,
    note: "Winners announced and the loot handed out.",
    sprite: "trophy",
  },
];

/** ⚠ PLACEHOLDER — set `reward` once prizes are confirmed (e.g. "LKR 50,000"). */
export const prizes: { place: string; title: string; reward: string; perks: string[]; tier: "gold" | "silver" | "bronze" }[] = [
  {
    place: "1st",
    title: "Champions",
    reward: "To be revealed",
    perks: ["Champion trophy", "Winner certificates"],
    tier: "gold",
  },
  {
    place: "2nd",
    title: "1st Runners-up",
    reward: "To be revealed",
    perks: ["Runner-up trophy", "Certificates"],
    tier: "silver",
  },
  {
    place: "3rd",
    title: "2nd Runners-up",
    reward: "To be revealed",
    perks: ["Runner-up trophy", "Certificates"],
    tier: "bronze",
  },
];

/** ⚠ PLACEHOLDER — standard CTF rules. Replace with the approved rule book. */
export const rules: { title: string; body: string }[] = [
  {
    title: "Build your team",
    body: `Teams have ${event.team.minSize} to ${event.team.maxSize} members, all currently enrolled undergraduates. One member is the team leader and the organisers' point of contact.`,
  },
  {
    title: "One player, one team",
    body: "A participant may register with one team only. Duplicate registrations are removed.",
  },
  {
    title: "Real identities",
    body: "Every member registers with their own university email and student ID. Organisers may ask for verification before or during the event.",
  },
  {
    title: "Play fair",
    body: "No flag sharing, no collaboration between teams, and no outside help during the competition.",
  },
  {
    title: "Hands off the infrastructure",
    body: "Attack the challenges — never the platform, the scoreboard or other teams. Denial-of-service and brute-forcing the platform are off limits.",
  },
  {
    title: "Organisers' call is final",
    body: "Rule violations can lead to point deductions or disqualification. Decisions by the ASE organising committee are final.",
  },
];

/** ⚠ PLACEHOLDER — adjust answers to the real event. */
export const faqs: { q: string; a: string }[] = [
  {
    q: "What is a Capture The Flag (CTF)?",
    a: "A cybersecurity competition where you solve challenges — breaking a web app, decoding a cipher, reversing a binary — to find a hidden string called a flag. Submit the flag, earn the points, climb the scoreboard.",
  },
  {
    q: "Who can take part?",
    a: "Undergraduates currently enrolled at a university or higher-education institute. Every member needs a valid student ID and a university email address.",
  },
  {
    q: "How many members can a team have?",
    a: `Between ${event.team.minSize} and ${event.team.maxSize}, including the team leader. Each person can belong to one team only.`,
  },
  {
    q: "We are new to CTFs. Can we still join?",
    a: "Yes. Challenges range from beginner-friendly to seriously hard, so first-timers will have plenty to solve.",
  },
  {
    q: "What happens after we register?",
    a: "You get a registration code on screen straight away — keep it. ASE reviews each team and contacts the team leader using the email and phone number provided.",
  },
  {
    q: "Can we change our team details later?",
    a: "Contact ASE with your registration code and the committee will update it for you.",
  },
  {
    q: "Is our personal information public?",
    a: "No. Participant details are visible only to authorised ASE organisers and are used solely to run the event.",
  },
];

/** Suggestions for the university picker. Free text is always allowed. */
export const universities: string[] = [
  "NSBM Green University",
  "University of Colombo",
  "University of Colombo School of Computing (UCSC)",
  "University of Moratuwa",
  "University of Peradeniya",
  "University of Sri Jayewardenepura",
  "University of Kelaniya",
  "University of Ruhuna",
  "University of Jaffna",
  "University of Vavuniya",
  "Sabaragamuwa University of Sri Lanka",
  "Wayamba University of Sri Lanka",
  "Rajarata University of Sri Lanka",
  "Uva Wellassa University",
  "Eastern University, Sri Lanka",
  "South Eastern University of Sri Lanka",
  "The Open University of Sri Lanka",
  "University of the Visual and Performing Arts",
  "Sri Lanka Institute of Information Technology (SLIIT)",
  "Informatics Institute of Technology (IIT)",
  "General Sir John Kotelawala Defence University (KDU)",
  "Sri Lanka Technology Campus (SLTC)",
  "Asia Pacific Institute of Information Technology (APIIT)",
  "National Institute of Business Management (NIBM)",
  "CINEC Campus",
  "Horizon Campus",
  "ICBT Campus",
  "ESOFT Metro Campus",
  "Saegis Campus",
  "KIU",
  "University of Vocational Technology (UoVT)",
  "Sri Lanka Institute of Advanced Technological Education (SLIATE)",
  "Institute of Technology, University of Moratuwa (ITUM)",
];
