"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    // On every route change, refresh the unread count silently
    // by dispatching a custom event that the AlertsBell listens to
    window.dispatchEvent(new CustomEvent("navigation-change"));
  }, [pathname]);

  return null;
}
