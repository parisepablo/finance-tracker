"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Banknote,
  Receipt,
  PieChart,
  CreditCard,
  Menu,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: Banknote },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/cards", label: "Cards", icon: CreditCard },
];

function NavLinks({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
}) {
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
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
              mobile
                ? "flex-col gap-1 py-2 px-1 text-xs"
                : "text-sm",
              isActive
                ? "text-indigo-400"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
            )}
          >
            {isActive && !mobile && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-500" />
            )}
            {isActive && !mobile && (
              <span className="absolute inset-0 rounded-lg bg-indigo-500/10" />
            )}
            <Icon className={cn(
              "shrink-0 relative z-10 transition-transform duration-150 ease-out group-hover:translate-x-0.5",
              mobile ? "h-5 w-5" : "h-4 w-4"
            )} />
            <span className="leading-none relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.06] bg-zinc-900/50 backdrop-blur-xl p-4">
        <div className="mb-8 px-3 flex items-center gap-2.5">
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
        <nav className="flex flex-col gap-0.5">
          <NavLinks />
        </nav>
      </aside>

      {/* Mobile header with sheet menu */}
      <header className="md:hidden flex items-center justify-between border-b border-white/[0.06] bg-zinc-900/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
            <Wallet className="h-4 w-4 text-indigo-400" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-white">
            Finance
          </h1>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-4 border-l border-white/[0.06] bg-zinc-900">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-8 px-3 flex items-center gap-2.5">
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
            <nav className="flex flex-col gap-0.5">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-zinc-900/90 backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-1">
          <NavLinks mobile />
        </div>
      </nav>
    </>
  );
}
