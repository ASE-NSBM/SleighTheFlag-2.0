import { llmsText } from "@/lib/seo";

/**
 * GET /llms.txt — the event's facts as plain Markdown, for AI assistants.
 * It reads nothing from the request, so it is generated once at build time.
 */
export function GET() {
  return new Response(llmsText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
