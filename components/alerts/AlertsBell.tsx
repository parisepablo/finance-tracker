"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { AlertsSheet } from "./AlertsSheet";
import { cn } from "@/lib/utils";

const GENERATE_COOLDOWN_MS = 30_000;

export function AlertsBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);
  const [open, setOpen] = useState(false);
  const lastGeneratedAt = useRef<number>(0);

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

  const generateAndFetch = useCallback(async () => {
    const now = Date.now();
    if (now - lastGeneratedAt.current < GENERATE_COOLDOWN_MS) {
      await fetchCount();
      return;
    }

    lastGeneratedAt.current = now;
    try {
      await fetch("/api/alerts/generate", { method: "POST" });
    } catch {
      // generation failure should not block count fetch
    } finally {
      await fetchCount();
    }
  }, [fetchCount]);

  useEffect(() => {
    generateAndFetch();
  }, [generateAndFetch]);

  useEffect(() => {
    function handleNavChange() {
      generateAndFetch();
    }
    window.addEventListener("navigation-change", handleNavChange);
    return () => window.removeEventListener("navigation-change", handleNavChange);
  }, [generateAndFetch]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center justify-center rounded-lg p-2 transition-colors",
          "text-zinc-400 hover:text-white hover:bg-[#2a2148]"
        )}
        aria-label="Notifications"
      >
        <Bell className={cn("h-5 w-5", hasCritical && "animate-pulse")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <AlertsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
