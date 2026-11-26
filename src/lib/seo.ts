import "server-only";
import { event, faqs, keywords, nav, organizer, realms, rules, timeline } from "@/config/event";
import { formatLongDay, formatTime } from "./format";
import { absoluteUrl, siteUrl } from "./site";

/**
 * Everything that helps search engines, answer engines and AI assistants
 * understand the event — written once, from the same config the page uses,
 * so the facts can never drift apart:
 *
 *   • the meta description (search result snippet)
 *   • questions and answers (page FAQ + FAQPage structured data)
 *   • schema.org structured data (Event, Organization, WebSite, FAQPage)
 *   • /llms.txt, a plain-text briefing for AI assistants
 */

const { minSize, maxSize } = event.team;

/** "Web Exploitation, Cryptography … and Misc & Steganography" — straight from the configured realms. */
const categories = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(realms.map((realm) => realm.category));

/** The handful of facts every summary repeats. */
export const facts = {
  day: formatLongDay(event.dates.eventStart),
  start: formatTime(event.dates.eventStart),
  end: formatTime(event.dates.eventEnd),
  registrationCloses: `${formatLongDay(event.dates.registrationCloses)} at ${formatTime(event.dates.registrationCloses)}`,
  teamSize: `${minSize} to ${maxSize} members`,
  organiser: `${organizer.name} (${organizer.shortName}) of ${organizer.university}, Sri Lanka`,
  /** Where it happens — null until the organisers have announced it. */
  place:
    event.attendance === "online"
      ? "online"
      : event.attendance === "onsite"
        ? event.venue
        : event.attendance === "hybrid"
          ? `${event.venue} and online`
          : null,
} as const;

/** "15 December 2026" — the long date without its weekday. */
const dateOnly = formatLongDay(event.dates.eventStart).replace(/^\w+,?\s+/, "");

/** One plain sentence, kept under ~160 characters so search results show all of it. */
export const metaDescription = `${event.fullName} is an inter-university CTF (Capture The Flag) cybersecurity competition by ${organizer.shortName}, ${organizer.university}, Sri Lanka, on ${dateOnly}.`;

/** The browser-tab and search-result title: the name, what it is, and who runs it — in under 60 characters. */
export const pageTitle = `${event.fullName} — ${event.searchTagline}`;

/** A fuller paragraph for places with room for it (structured data, llms.txt). */
export const summary = [
  `${event.fullName} is an inter-university Capture The Flag (CTF) cybersecurity competition organised by the ${facts.organiser}.`,
  `It takes place on ${facts.day}, from ${facts.start} to ${facts.end} Sri Lanka time${facts.place ? `, ${facts.place === "online" ? "online" : `at ${facts.place}`}` : ""}.`,
  `Teams of ${facts.teamSize} university undergraduates solve security challenges in ${categories} to capture hidden flags and score points.`,
  `Team registration is open on the event website and closes on ${facts.registrationCloses}.`,
].join(" ");

/* ───────────────────────── questions and answers ─────────────────────── */

/**
 * The questions people (and answer engines) ask first, answered from the live
 * config so a changed date is never contradicted by a stale answer.
 */
const generatedFaqs: { q: string; a: string }[] = [
  {
    q: `When is ${event.fullName}?`,
    a: `${event.fullName} takes place on ${facts.day}, from ${facts.start} to ${facts.end} Sri Lanka time (GMT+5:30). Team registration closes on ${facts.registrationCloses}.`,
  },
  {
    q: "How do we register a team?",
    a: `Use the registration form on this page. Enter a team name and your university, then each member's full name, student ID, email (a university email if they have one) and contact number — the team leader goes first. Teams have ${facts.teamSize}. You receive a registration code as soon as you submit.`,
  },
  {
    q: `Who organises ${event.name}?`,
    a: `${event.fullName} is organised by the ${facts.organiser}. You can reach the organisers at ${organizer.email}.`,
  },
];

/** Every question shown on the page, in order. */
export const allFaqs: { q: string; a: string }[] = [...generatedFaqs, ...faqs];

/* ───────────────────────────── structured data ───────────────────────── */

const ID = {
  site: `${siteUrl}/#website`,
  page: `${siteUrl}/#webpage`,
  event: `${siteUrl}/#event`,
  organiser: `${siteUrl}/#organizer`,
  faq: `${siteUrl}/#faq`,
};

function eventPlace(): Record<string, unknown> {
  const place = {
    "@type": "Place",
    name: event.venue,
    address: {
      "@type": "PostalAddress",
      streetAddress: event.venueAddress || organizer.address,
      addressCountry: "LK",
    },
  };
  const online = { "@type": "VirtualLocation", url: absoluteUrl("/") };
  switch (event.attendance) {
    case "onsite":
      return { eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: place };
    case "online":
      return { eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: online };
    case "hybrid":
      return { eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode", location: [place, online] };
    default:
      return {}; // not announced yet: say nothing rather than guess
  }
}

/** schema.org description of the page, as one linked graph. */
export function structuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": ID.site,
        url: absoluteUrl("/"),
        name: event.fullName,
        description: metaDescription,
        inLanguage: "en",
        publisher: { "@id": ID.organiser },
      },
      {
        "@type": "WebPage",
        "@id": ID.page,
        url: absoluteUrl("/"),
        name: pageTitle,
        description: metaDescription,
        inLanguage: "en",
        isPartOf: { "@id": ID.site },
        about: { "@id": ID.event },
        primaryImageOfPage: absoluteUrl("/opengraph-image"),
      },
      {
        "@type": "Event",
        "@id": ID.event,
        name: event.fullName,
        description: summary,
        url: absoluteUrl("/"),
        image: [absoluteUrl("/opengraph-image")],
        startDate: event.dates.eventStart,
        endDate: event.dates.eventEnd,
        eventStatus: "https://schema.org/EventScheduled",
        ...eventPlace(),
        organizer: { "@id": ID.organiser },
        inLanguage: "en",
        keywords: keywords.join(", "),
        audience: { "@type": "EducationalAudience", educationalRole: "student" },
      },
      {
        "@type": "Organization",
        "@id": ID.organiser,
        name: organizer.name,
        alternateName: organizer.shortName,
        description: organizer.about,
        slogan: organizer.motto,
        logo: absoluteUrl(organizer.logo),
        email: organizer.email,
        telephone: organizer.phone,
        address: { "@type": "PostalAddress", streetAddress: organizer.address, addressCountry: "LK" },
        parentOrganization: { "@type": "CollegeOrUniversity", name: organizer.university },
        sameAs: organizer.socials.map((social) => social.url),
      },
      {
        "@type": "FAQPage",
        "@id": ID.faq,
        isPartOf: { "@id": ID.page },
        mainEntity: allFaqs.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}

/** Safe to drop into a <script type="application/ld+json">: "<" can't close the tag early. */
export const structuredDataJson = () => JSON.stringify(structuredData()).replace(/</g, "\\u003c");

/* ───────────────────────────── llms.txt ──────────────────────────────── */

/**
 * /llms.txt — a short Markdown briefing for AI assistants (the llmstxt.org
 * convention). Not every assistant reads it, but it costs nothing and gives
 * the ones that do the facts in one clean, quotable place.
 */
export function llmsText(): string {
  const section = (id: string) => absoluteUrl(`/#${id}`);
  const lines: string[] = [
    `# ${event.fullName}`,
    "",
    `> ${summary}`,
    "",
    "## Key facts",
    "",
    `- **Event:** ${event.fullName} — ${event.kicker}`,
    `- **Date:** ${facts.day}`,
    `- **Time:** ${facts.start} to ${facts.end}, Sri Lanka time (GMT+5:30)`,
    `- **Where:** ${facts.place ?? "to be announced"}`,
    `- **Format:** ${event.format}`,
    `- **Team size:** ${facts.teamSize}, including the team leader`,
    "- **Who can take part:** university undergraduates",
    `- **Registration closes:** ${facts.registrationCloses}`,
    `- **Register at:** ${section("register")}`,
    `- **Organiser:** ${facts.organiser}`,
    `- **Contact:** ${organizer.email}, ${organizer.phone}`,
    "",
    "## Timeline",
    "",
    ...timeline.map((item) => `- **${item.title}:** ${formatLongDay(item.at)}, ${formatTime(item.at)} — ${item.note}`),
    "",
    "## Challenge categories",
    "",
    ...realms.map((realm) => `- **${realm.category}** (“${realm.name}”): ${realm.blurb}`),
    "",
    "## Rules",
    "",
    ...rules.map((rule, index) => `${index + 1}. **${rule.title}.** ${rule.body}`),
    "",
    "## Frequently asked questions",
    "",
    ...allFaqs.flatMap((item) => [`### ${item.q}`, "", item.a, ""]),
    "## Organiser",
    "",
    `${organizer.name} (${organizer.shortName}), ${organizer.university}. ${organizer.about}`,
    "",
    `- Address: ${organizer.address}`,
    ...organizer.socials.map((social) => `- ${social.label}: ${social.url}`),
    "",
    "## Sections of the site",
    "",
    ...nav.slice(1).map((item) => `- [${item.label}](${section(item.id)}): ${item.hint}`),
    "",
  ];
  return lines.join("\n");
}
