import type { MetadataRoute } from "next";
import { event } from "@/config/event";
import { metaDescription } from "@/lib/seo";

/** Name, colours and icon used when the site is saved to a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: event.fullName,
    short_name: event.name,
    description: metaDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#04060f",
    theme_color: "#080d1f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
