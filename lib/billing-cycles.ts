export function addWeekdays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0 = Sunday, 6 = Saturday
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  return result;
}

export function previousWeekday(date: Date): Date {
  const result = new Date(date);
  const dow = result.getDay();
  if (dow === 6) {
    // Saturday → previous Friday
    result.setDate(result.getDate() - 1);
  } else if (dow === 0) {
    // Sunday → previous Friday
    result.setDate(result.getDate() - 2);
  }
  return result;
}

export function nextClosingDate(lastClosingDate: Date): Date {
  const raw = new Date(lastClosingDate);
  raw.setDate(raw.getDate() + 30);
  return previousWeekday(raw);
}

export function nextDueDate(closingDate: Date): Date {
  return addWeekdays(closingDate, 9);
}

export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

import { BillingCycle } from "@/lib/types";

export function getCycleRange(cycles: BillingCycle[], offset: number = 0): { start: string; end: string; label: string } | null {
  const sorted = [...cycles].sort(
    (a, b) => new Date(b.closing_date + "T00:00:00").getTime() - new Date(a.closing_date + "T00:00:00").getTime()
  );
  if (sorted.length === 0) return null;

  const cycle = sorted[offset] ?? sorted[sorted.length - 1];

  const startDate = new Date(cycle.opening_date + "T00:00:00");
  const endDate = new Date(cycle.closing_date + "T00:00:00");

  return {
    start: toDateParam(startDate),
    end: toDateParam(endDate),
    label: `${formatDateShort(toDateParam(startDate))} – ${formatDateShort(toDateParam(endDate))}`,
  };
}
