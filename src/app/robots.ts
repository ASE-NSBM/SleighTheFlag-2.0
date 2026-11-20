import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Never worth crawling: the organisers' panel and the JSON endpoints. */
const PRIVATE = ["/admin", "/api/"];

/**
 * AI search and answer engines, named one by one. The "*" rule already lets
 * them in; listing them makes the intent unmistakable — this site wants to be
 * read, quoted and recommended — and keeps that true if a blanket rule is
 * ever tightened later.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "meta-externalagent",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
