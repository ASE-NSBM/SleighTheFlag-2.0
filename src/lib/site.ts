import "server-only";

/**
 * The public address of the site, without a trailing slash.
 *
 * Canonical links, the sitemap, link previews and structured data are all
 * built from this, so it must be the address people actually visit:
 *   1. NEXT_PUBLIC_SITE_URL, when set (do this once you have a custom domain);
 *   2. otherwise, on Vercel, the project's production domain;
 *   3. otherwise localhost, for development.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

/** "/#register" → "https://example.lk/#register" */
export const absoluteUrl = (path = "/") => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
