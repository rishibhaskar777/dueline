import type { Metadata, Viewport } from "next";
import { Figtree, Outfit } from "next/font/google";
import { Backdrop } from "@/components/layout/Backdrop";
import { THEME_INIT_SCRIPT } from "@/components/layout/theme";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c11" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${figtree.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="relative isolate min-h-full">
        <Backdrop />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
