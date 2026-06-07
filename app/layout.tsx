import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { GlobalFab } from "@/components/GlobalFab";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { NavigationEvents } from "@/components/alerts/NavigationEvents";
import { Wallet } from "lucide-react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance tracking application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finance",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
  userScalable: false,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 flex flex-col pb-24 md:pb-0 relative">
          {/* Mobile header with bell icon */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
                <Wallet className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <span className="text-sm font-semibold text-white">Finance</span>
            </div>
            <AlertsBell />
          </div>
          <div className="animate-in fade-in duration-300 flex flex-col flex-1">
            {children}
          </div>
        </main>
        <GlobalFab />
        <NavigationEvents />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#fafafa",
            },
          }}
        />
      </body>
    </html>
  );
}
