"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { AlertsSheet } from "./AlertsSheet";
import { cn } from "@/lib/utils";

export function AlertsBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/count");
      const result = await res.json();
      if (res.ok) {
        setUnreadCount(result.unread ?? 0);
        setHasCritical(!!result.hasCritical);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    function handleNavChange() {
      fetchCount();
    }
    window.addEventListener("navigation-change", handleNavChange);
    return () => window.removeEventListener("navigation-change", handleNavChange);
  }, [fetchCount]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center rounded-lg p-2 transition-colors",
          "text-zinc-400 hover:text-white hover:bg-zinc-800"
        )}
        aria-label="Notifications"
      >
        <Bell className={cn("h-5 w-5", hasCritical && "animate-pulse")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <AlertsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
