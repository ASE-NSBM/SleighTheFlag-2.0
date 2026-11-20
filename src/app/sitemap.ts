import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** One public page — everything else is the admin panel or an API. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
      images: [absoluteUrl("/opengraph-image")],
    },
  ];
}
