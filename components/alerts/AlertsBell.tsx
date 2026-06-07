"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { AlertsSheet } from "./AlertsSheet";
import { cn } from "@/lib/utils";

export function AlertsBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCritical, setHasCritical] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      const result = await res.json();
      if (res.ok) {
        const alerts = result.data ?? [];
        setUnreadCount(alerts.filter((a: { is_read: boolean }) => !a.is_read).length);
        setHasCritical(
          alerts.some(
            (a: { priority: string; is_read: boolean }) =>
              a.priority === "critical" && !a.is_read
          )
        );
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    function handleNavChange() {
      fetchUnread();
    }
    window.addEventListener("navigation-change", handleNavChange);
    return () => window.removeEventListener("navigation-change", handleNavChange);
  }, [fetchUnread]);

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
