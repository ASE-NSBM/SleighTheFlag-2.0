import type { Metadata, Viewport } from "next";
import { Pixelify_Sans, Press_Start_2P, VT323 } from "next/font/google";
import { event, organizer } from "@/config/event";
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

export const metadata: Metadata = {
  metadataBase: new URL(event.siteUrl),
  title: {
    default: `${event.fullName} — ${event.kicker}`,
    template: `%s · ${event.fullName}`,
  },
  description: event.description,
  applicationName: event.fullName,
  authors: [{ name: `${organizer.name} (${organizer.shortName}), ${organizer.university}` }],
  keywords: ["CTF", "Capture The Flag", "Sleigh The Flag", "NSBM", "ASE", "cybersecurity", "Sri Lanka", "university competition"],
  openGraph: {
    type: "website",
    siteName: event.fullName,
    title: `${event.fullName} — ${event.kicker}`,
    description: event.description,
    locale: "en_LK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${event.fullName} — ${event.kicker}`,
    description: event.description,
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
    <html lang="en" className={`${pressStart.variable} ${pixelify.variable} ${vt323.variable}`}>
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
