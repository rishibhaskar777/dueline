import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  weight: ["500", "600"],
  subsets: ["latin"],
});

const SITE_URL = "https://dueline-azure.vercel.app";
const TAGLINE = "Get paid by clients abroad without chasing them";
const DESCRIPTION = "Cross-border receivables for freelancers in India, built on PayPal";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Dueline", template: "%s · Dueline" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Dueline",
    title: `Dueline: ${TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `Dueline: ${TAGLINE}`,
    description: DESCRIPTION,
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { title: "Dueline", capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0D1B2E" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexCondensed.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
