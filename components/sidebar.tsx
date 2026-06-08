"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { useVisibility } from "@/components/visibility-provider";
import { Eye, EyeOff } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/cards", label: "Cards", icon: CreditCard },
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
                ? "text-indigo-400"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-500" />
            )}
            {isActive && (
              <span className="absolute inset-0 rounded-lg bg-indigo-500/10" />
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-around px-2 pt-2 bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-1 px-3 min-w-[64px] transition-colors",
                isActive ? "text-indigo-500" : "text-zinc-500"
              )}
            >
              {isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-500" />
              )}
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function VisibilityToggle() {
  const { valuesVisible, toggleVisibility } = useVisibility();
  return (
    <button
      onClick={toggleVisibility}
      className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      aria-label={valuesVisible ? "Hide values" : "Show values"}
    >
      {valuesVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
    </button>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.06] bg-zinc-900 backdrop-blur-xl p-4">
        <div className="mb-8 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
              <Wallet className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">
                Finance
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Tracker
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
