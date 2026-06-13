import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { GlobalFab } from "@/components/GlobalFab";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { NavigationEvents } from "@/components/alerts/NavigationEvents";
import { VisibilityProvider } from "@/components/visibility-provider";
import { VisibilityToggle } from "@/components/visibility-toggle";
import { MonthProvider } from "@/context/month-context";
import { ConditionalMonthSelector } from "@/components/conditional-month-selector";
import { Wallet } from "lucide-react";
import { autoAdvanceCycles } from "@/lib/actions/billing-cycles";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "$cinco",
  description: "Personal finance tracking application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "$cinco",
  },
  icons: {
    apple: "/icon-192x192.png",
    icon: "/favicon-32x32.png",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Non-blocking auto-advance billing cycles after response
  after(() => {
    autoAdvanceCycles().catch(() => {});
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {isAuthenticated ? (
          <div className="min-h-full flex flex-col md:flex-row">
            <MonthProvider>
              <VisibilityProvider>
                {/* Prefetch unread count on initial page load */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `fetch('/api/alerts/count').catch(() => {});`,
                  }}
                />
                <Sidebar />
                <main className="flex-1 flex flex-col pb-24 md:pb-0 relative">
                  {/* Mobile header */}
                  <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src="/favicon-32x32.png" alt="$cinco" className="h-7 w-7 shrink-0 rounded-lg" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">Cinco</span>
                        <span className="text-sm font-semibold text-emerald-400 truncate">pal peso</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <VisibilityToggle />
                      <AlertsBell />
                    </div>
                  </div>
                  {/* Desktop header with month selector */}
                  <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
                    <div className="flex items-center gap-2 min-w-0 w-48">
                      <img src="/favicon-32x32.png" alt="$cinco" className="h-7 w-7 shrink-0 rounded-lg" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">Cinco</span>
                        <span className="text-sm font-semibold text-emerald-400 truncate">pal peso</span>
                      </div>
                    </div>
                    <Suspense fallback={null}>
                      <ConditionalMonthSelector />
                    </Suspense>
                    <div className="flex items-center gap-1 flex-shrink-0 w-48 justify-end">
                      <VisibilityToggle />
                      <AlertsBell />
                    </div>
                  </div>
                  {/* Mobile month selector */}
                  <div className="md:hidden flex items-center justify-center py-2 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
                    <Suspense fallback={null}>
                      <ConditionalMonthSelector />
                    </Suspense>
                  </div>
                  <div className="animate-in fade-in duration-300 flex flex-col flex-1">
                    {children}
                  </div>
                </main>
                <Suspense fallback={null}>
                  <GlobalFab />
                </Suspense>
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
              </VisibilityProvider>
            </MonthProvider>
          </div>
        ) : (
          <>
            {children}
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
          </>
        )}
      </body>
    </html>
  );
}
