import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { SITE } from "@/lib/site";

/*
 * The same three families the native app embeds (see apps/native/theme/fonts.ts),
 * pulled from Google Fonts here rather than bundled. Keeping them identical is
 * the point — someone who taps through from the store listing should land on a
 * page that reads like the app they just saw.
 */
const sans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const display = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const title = `${SITE.name} — ${SITE.tagline}`;

export const metadata: Metadata = {
  title,
  description: SITE.description,
  openGraph: {
    title,
    description: SITE.description,
    siteName: SITE.name,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas font-sans text-fg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
