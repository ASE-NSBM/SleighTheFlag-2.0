# Sleigh The Flag 2.0

Team-registration site for **Sleigh The Flag 2.0**, the Capture The Flag competition organised by the
**Association of Software Engineering (ASE), NSBM Green University**.

A voxel, Christmas-night world rendered live in the browser (three.js), a four-step team registration
flow, and an admin panel to review, edit and export registrations.

- **Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · three.js · libSQL (SQLite)
- **No external services required** to run it locally: the database is a file.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then set ADMIN_PASSWORD (8+ characters)
npm run dev
```

| URL | What |
| --- | --- |
| <http://localhost:3000> | Public site + registration |
| <http://localhost:3000/admin> | Admin panel (sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`) |

Requires Node.js 20.9 or newer.

## Before you go live

1. **Edit [`src/config/event.ts`](src/config/event.ts).** Every date, the team size, venue, prizes,
   rules, FAQ and all wording live in that one file. Values marked `⚠ PLACEHOLDER` were invented so
   the site had something to show — **confirm or replace each of them**.
2. **Set the environment** (see the table below). Use a long random `ADMIN_PASSWORD`.
3. **Pick where the data lives** — a file on a server you control, or a hosted database
   (see [Database](#database)).
4. **Serve it over HTTPS.** The admin session cookie is marked `Secure` automatically on HTTPS.
5. Optional: add event coordinators to `organizer.contacts` in the config, and replace
   `public/ase-logo.jpg` with a higher-resolution logo.

## What is collected

Per team: **team name**, **university**. Per member (the first one is the **team leader**):
**full name**, **student ID**, **university email**, **contact number**.

Rules enforced on the server (the browser only mirrors them for instant feedback):

- Team size between `team.minSize` and `team.maxSize` (leader included).
- Team names are unique; an email can belong to one team only; no duplicate email / student ID inside a team.
- Emails must be university inboxes — public providers (Gmail, Outlook, Yahoo…) are rejected.
  Turn this off with `requireUniversityEmail: false` in the config.
- Phone numbers accept the usual Sri Lankan spellings (`077 123 4567`, `+94 77 123 4567`…) or any
  international `+` number, and are stored in one normalised format.
- Registration only works while it is open: inside the configured dates, not paused by an organiser,
  and under the team cap (if one is set).

Every team gets a short reference code (for example `STF-7KQ2MX`) shown on the confirmation screen.

## Admin panel

`/admin` — one shared organiser account, configured with environment variables.

- **Overview:** teams, players, universities, registrations per day, review status, latest arrivals.
- **Teams:** search (team, person, email, ID, code), filter by status / university, sort, open a team
  for full details, approve / reject, add a team by hand, edit, delete, bulk actions, organiser notes.
- **Export:** Excel workbook (`.xlsx`, two sheets: one row per team, one row per participant), CSV in
  both layouts, and JSON. Exports respect the current filter or selection.
- **Settings:** pause / resume registration, cap the number of teams, ignore the configured dates.

Organiser entries are deliberately more lenient than the public form: a personal email or a
one-person team can be let through as an exception.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | **yes** | Admin password. The panel stays locked until this is 8+ characters. |
| `ADMIN_USERNAME` | no | Admin username (default `admin`). |
| `SESSION_SECRET` | recommended | Signs the admin session cookie (`openssl rand -hex 32`). When empty it is derived from the password. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Public URL, used for link-preview cards. On Vercel it defaults to the production domain. |
| `GOOGLE_SITE_VERIFICATION` | no | Verification code from Google Search Console (the `content` value of its meta tag). |
| `BING_SITE_VERIFICATION` | no | Verification code from Bing Webmaster Tools. |
| `DATABASE_URL` | on serverless | Empty → local file `./data/sleigh-the-flag.db`. Or `file:/path/to.db`, or `libsql://…` for Turso. `TURSO_DATABASE_URL` works too. |
| `DATABASE_AUTH_TOKEN` | with Turso | Auth token for the hosted database. `TURSO_AUTH_TOKEN` works too. |

## Database

The data layer is [libSQL](https://github.com/tursodatabase/libsql) (SQLite). Tables are created
automatically on first use.

- **A server with a disk (VPS, Docker volume):** leave `DATABASE_URL` empty. Everything is stored in
  `data/sleigh-the-flag.db`. Back it up by copying that file. The `data/` folder is git-ignored —
  it contains personal data and must never be committed.
- **Serverless hosting (Vercel, Netlify…):** the disk there is not persistent, so a hosted
  [Turso](https://turso.tech) database is required — see [Deploying to Vercel](#deploying-to-vercel).
  Without one the site still loads, but registration reports itself unavailable and the admin
  panel tells you the database is missing. It never falls back to a temporary file.

## Deploying to Vercel

The repository deploys as-is — Vercel detects Next.js and needs no build settings.

1. **Import the project.** In Vercel: *Add New → Project*, pick this GitHub repository, keep the
   defaults. (The first deploy will work, but registration stays unavailable until step 2.)
2. **Add the database.** In the project's *Storage* tab, create a **Turso** database and connect it
   to the project. That adds `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, which the app reads
   automatically. (Created the database on turso.tech instead? Add its URL and token yourself as
   `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.)
3. **Add the admin sign-in.** In *Settings → Environment Variables* (Production):

   | Name | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | a long random password — `openssl rand -base64 24` |
   | `SESSION_SECRET` | `openssl rand -hex 32` |
   | `ADMIN_USERNAME` | optional, defaults to `admin` |
   | `NEXT_PUBLIC_SITE_URL` | optional — your final URL, e.g. `https://stf.example.lk`. Left empty, link previews use the project's production domain. |

4. **Redeploy** (*Deployments → ⋯ → Redeploy*) so the new variables take effect.
5. **Check it.** Open `/admin`, sign in, and make sure the Overview loads without a red error.
   Register a test team on the public page, see it appear in *Teams*, then delete it.
6. **Custom domain** (optional): *Settings → Domains*, then point a `CNAME` at Vercel as shown there.

Good to know on Vercel:

- **Keep the function next to the database.** Vercel runs functions in `iad1` (US East) by default.
  If you create the Turso database in another region, set the same area under
  *Settings → Functions → Function Region*. Pages themselves are served from the CDN either way.
- **Rate limiting is per instance.** The built-in limiter lives in memory, so on serverless it is
  only a speed bump. Turn on Vercel's Firewall rules if you expect abuse.
- **Changing dates or wording** means editing `src/config/event.ts` and pushing — every push to the
  main branch redeploys.
- **Tables are created automatically** on the first request; there is no migration step.

## Deploying to your own server

```bash
npm ci
npm run build
npm start            # listens on :3000 (PORT=8080 npm start to change)
```

Run it behind a reverse proxy (nginx, Caddy, Cloudflare) that terminates HTTPS and forwards
`X-Forwarded-For` and `X-Forwarded-Proto`. Rate limiting (registration, login) is keyed on the
client address taken from that header. Leave `DATABASE_URL` empty to store everything in
`data/sleigh-the-flag.db`, and keep that folder on a persistent disk.

## Search and AI visibility (SEO · AEO · GEO)

Built in, and all generated from `src/config/event.ts` so the facts never drift apart:

| What | Where | For |
| --- | --- | --- |
| Title, description, canonical URL, Open Graph / X cards | `src/app/layout.tsx`, `src/lib/seo.ts` | Search results and link previews |
| `robots.txt` | `src/app/robots.ts` | Lets search *and* AI crawlers in; keeps `/admin` and `/api` out |
| `sitemap.xml` | `src/app/sitemap.ts` | Tells search engines the page exists |
| Structured data (schema.org `Event`, `Organization`, `WebSite`, `FAQPage`) | `src/lib/seo.ts` | Event listings, knowledge panels, answer engines |
| Question-and-answer section with real headings | `src/components/sections/Faq.tsx` | Featured snippets, voice and AI answers |
| `llms.txt` | `src/app/llms.txt/route.ts` | A plain-text briefing for AI assistants |
| Web app manifest | `src/app/manifest.ts` | Name and icon when saved to a phone |

Every fact is in the HTML the server sends, so crawlers that do not run JavaScript still read
everything.

**After you deploy**

1. Set `NEXT_PUBLIC_SITE_URL` to the final address once you have a custom domain, and redeploy —
   canonical links, the sitemap and structured data are all built from it.
2. Add the site to [Google Search Console](https://search.google.com/search-console) and
   [Bing Webmaster Tools](https://www.bing.com/webmasters), then submit `/sitemap.xml` in each.
   If they ask for a meta tag, put the code in `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`.
   (Bing matters twice: several AI assistants search through it.)
3. Check the structured data with Google's [Rich Results Test](https://search.google.com/test/rich-results).
4. Set `attendance` (and `venue`) in the config as soon as the place is decided — search engines
   only show an event listing when they know where it happens.
5. Link to the site from ASE's and NSBM's own pages and social profiles. No amount of on-page
   work replaces other trusted sites pointing at you.

Search engines take days to weeks to pick a new site up, and nothing here can promise a ranking —
it removes the obstacles and states the facts clearly.

## Project structure

```
src/
  config/event.ts            ← all event content and settings (start here)
  app/
    page.tsx                 ← the public page (one long scroll)
    opengraph-image.tsx      ← link-preview card, drawn in code
    admin/                   ← login + panel pages
    api/
      register/              ← public registration
      public/                ← registration status, team-name availability
      admin/                 ← teams CRUD, bulk actions, export, settings, login/logout
  components/
    world/engine/            ← the three.js world: terrain, sky, particles, camera
    sections/                ← Hero, About, Realms, Timeline, Loot, Rules, Register, FAQ, Guild
    register/                ← the registration wizard
    admin/                   ← admin UI (table, drawer, form, dashboard)
    hud/                     ← hotbar, XP bar, loading curtain, scroll tracking
    ui/                      ← pixel sprites, avatars, toasts
  lib/                       ← database, validation, auth, export, rate limiting
```

## Customising the look

- **Colours, panels, buttons:** `src/app/globals.css` (design tokens at the top).
- **Icons and item sprites:** `src/components/ui/sprites.ts` — each sprite is ASCII pixel art;
  edit the characters to redraw it.
- **The island:** `src/components/world/engine/island.ts` builds the terrain, cabin, tree and
  props; `atlas.ts` paints the block textures.
- **Camera path:** `src/components/world/engine/camera.ts` — one shot per page section, in the
  same order as `nav` in the config.

All artwork is generated in code; the project ships no third-party image or model assets.

## Good to know

- **Accessibility:** keyboard reachable throughout, visible focus, labelled fields with inline errors,
  `prefers-reduced-motion` freezes the 3D scene and disables animation, and the page works (with a
  static sky) when WebGL is unavailable.
- **Performance:** the 3D world is one baked mesh plus a few particle systems, loads after the page
  is interactive, lowers its resolution automatically on slow devices and pauses in background tabs.
- **Keyboard:** keys `1`–`9` jump between sections; `/` focuses search in the admin table.
- **Stale styles in development?** Stop the dev server, delete `.next/`, start again.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run TypeScript |

## Credits

Organised by the [Association of Software Engineering](https://www.linkedin.com/company/asensbm), NSBM Green University.
Fonts: Press Start 2P, Pixelify Sans, VT323 and the digits of Jersey 10 (all SIL Open Font License, served locally via `next/font`).
Sleigh The Flag is an independent student event; this site is not affiliated with or endorsed by
Mojang or Microsoft.

Licensed under the [Apache License 2.0](LICENSE).
