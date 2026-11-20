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
| `NEXT_PUBLIC_SITE_URL` | recommended | Public URL, used for link-preview cards. |
| `DATABASE_URL` | no | Empty → local file `./data/sleigh-the-flag.db`. Or `file:/path/to.db`, or `libsql://…` for Turso. |
| `DATABASE_AUTH_TOKEN` | with Turso | Auth token for a hosted libSQL database. |

## Database

The data layer is [libSQL](https://github.com/tursodatabase/libsql) (SQLite). Tables are created
automatically on first use.

- **A server with a disk (VPS, Docker volume):** leave `DATABASE_URL` empty. Everything is stored in
  `data/sleigh-the-flag.db`. Back it up by copying that file. The `data/` folder is git-ignored —
  it contains personal data and must never be committed.
- **Serverless hosting (Vercel, Netlify…):** the disk there is not persistent. Create a free
  [Turso](https://turso.tech) database and set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.

## Deployment

**Node server**

```bash
npm ci
npm run build
npm start            # listens on :3000 (PORT=8080 npm start to change)
```

Run it behind a reverse proxy (nginx, Caddy, Cloudflare) that terminates HTTPS and forwards
`X-Forwarded-For` and `X-Forwarded-Proto`. Rate limiting (registration, login) is keyed on the
client address taken from that header.

**Vercel:** import the repository, add the environment variables, and use a Turso database.
The built-in rate limiter is in-memory, so on serverless it only acts per instance — add the
platform's own protection if you expect abuse.

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
Fonts: Press Start 2P, Pixelify Sans and VT323 (SIL Open Font License, served locally via `next/font`).
Sleigh The Flag is an independent student event; this site is not affiliated with or endorsed by
Mojang or Microsoft.

Licensed under the [Apache License 2.0](LICENSE).
