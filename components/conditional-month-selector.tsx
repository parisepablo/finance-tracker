"use client";

import { usePathname } from "next/navigation";
import { MonthSelector } from "./month-selector";

export function ConditionalMonthSelector() {
  const pathname = usePathname();
  if (
    pathname === "/cards" ||
    pathname.startsWith("/cards/") ||
    pathname === "/analytics"
  ) {
    return null;
  }
  return <MonthSelector />;
}
