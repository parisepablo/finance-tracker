"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMonth } from "@/context/month-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function parseMonthParam(param: string | null): Date | null {
  if (!param) return null;
  const [year, month] = param.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function toMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync URL param to context on mount / URL change
  useEffect(() => {
    const param = searchParams.get("month");
    const parsed = parseMonthParam(param);
    if (parsed && !isSameMonth(parsed, selectedMonth)) {
      setSelectedMonth(parsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateMonth = useCallback(
    (newMonth: Date) => {
      setSelectedMonth(newMonth);
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", toMonthParam(newMonth));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [setSelectedMonth, searchParams, pathname, router]
  );

  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now);

  function prevMonth() {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() - 1);
    updateMonth(d);
  }

  function nextMonth() {
    if (isCurrentMonth) return;
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + 1);
    updateMonth(d);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={prevMonth}
        className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      <span className="min-w-[80px] text-center text-xs font-normal capitalize text-zinc-500 select-none">
        {formatMonthLabel(selectedMonth)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={nextMonth}
        disabled={isCurrentMonth}
        className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
