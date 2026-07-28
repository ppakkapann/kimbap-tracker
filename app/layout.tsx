import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppShellChrome } from "@/components/layout/AppShellChrome";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Gumi Gimi Kimbap",
  description: "คำนวณต้นทุน สต็อก และกำไรร้านคิมบับ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Gumi Gimi Kimbap",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${googleSans.variable} h-full`}
    >
      <body className="min-h-screen">
        <div className="app-shell">
          <Sidebar />
          <div className="app-main">
            <AppShellChrome />
            <main className="app-content pb-nav-safe md:pb-8">{children}</main>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
