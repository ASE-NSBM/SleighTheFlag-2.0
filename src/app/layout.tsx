import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P, VT323 } from "next/font/google";
import { event, keywords, organizer } from "@/config/event";
import { metaDescription, pageTitle } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import "./globals.css";

/* Chunky 8-bit capitals for titles, buttons and HUD labels. */
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

/* A pixel face that stays readable in paragraphs and form fields. */
const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
  display: "swap",
});

/* Terminal face for flags, codes and anything "hacker". */
const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const organiserName = `${organizer.name} (${organizer.shortName}), ${organizer.university}`;

/** Ownership checks for Google Search Console and Bing Webmaster Tools (optional). */
const verification = {
  google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: pageTitle,
    template: `%s · ${event.fullName}`,
  },
  description: metaDescription,
  applicationName: event.fullName,
  authors: [{ name: organiserName }],
  creator: organiserName,
  publisher: organiserName,
  category: "technology",
  keywords,
  // Search engines may index the site and show full previews; the admin panel overrides this.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  verification,
  openGraph: {
    type: "website",
    url: "/",
    siteName: event.fullName,
    title: pageTitle,
    description: metaDescription,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: metaDescription,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080d1f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${pressStart.variable} ${pixelify.variable} ${vt323.variable}`}>
      <body>
        {children}
        {/* Without JavaScript nothing can scroll-reveal or lift the loading curtain. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}.boot{display:none!important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
