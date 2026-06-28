"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { VisibilityToggle } from "@/components/visibility-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/cards", label: "Cards & Wallets", icon: CreditCard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const desktopNavItems = [
  ...navItems,
  { href: "/settings", label: "Settings", icon: Settings },
];

function DesktopNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
              isActive
                ? "text-emerald-400"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-[#18122B]/50"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-emerald-500" />
            )}
            {isActive && (
              <span className="absolute inset-0 rounded-lg bg-emerald-500/10" />
            )}
            <Icon className="shrink-0 relative z-10 transition-transform duration-150 ease-out group-hover:translate-x-0.5 h-4 w-4" />
            <span className="leading-none relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#18122B] bg-[#09070f]">
      <div className="flex items-stretch px-2 pt-2 bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 text-center transition-colors",
                isActive ? "text-emerald-500" : "text-zinc-500"
              )}
            >
              {isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-500" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium leading-tight text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-violet-500/10 bg-[#0f0c19] backdrop-blur-xl p-4">
        <div className="mb-8 px-3 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon-32x32.png"
              alt="$cinco"
              className="h-8 w-8 shrink-0 rounded-lg"
            />
            <div className="min-w-0 flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-white truncate">
                Cinco
              </span>
              <span className="text-sm font-semibold tracking-tight text-emerald-400 truncate">
                pal peso
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <VisibilityToggle />
            <AlertsBell />
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          <DesktopNavLinks />
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </>
  );
}
