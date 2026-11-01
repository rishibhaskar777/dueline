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

export const metadata: Metadata = {
  title: { default: "Dueline", template: "%s · Dueline" },
  description: "Cross-border receivables for freelancers in India, built on PayPal",
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
