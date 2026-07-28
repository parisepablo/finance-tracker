"use client";

import { usePathname } from "next/navigation";
import { MonthSelector } from "./month-selector";

export function ConditionalMonthSelector() {
  const pathname = usePathname();

  // Only show the month selector on pages that actually consume the ?month param.
  // Other pages (settings, cards, analytics, etc.) don't need it.
  if (pathname === "/" || pathname === "/finances") {
    return <MonthSelector />;
  }

  return null;
}
