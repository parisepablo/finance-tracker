"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert } from "@/lib/types";
import { AlertItem } from "./AlertItem";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800 p-3">
      <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0 rounded bg-zinc-700" />
          <Skeleton className="h-4 w-32 rounded bg-zinc-700" />
        </div>
        <Skeleton className="h-3 w-full rounded bg-zinc-800" />
        <Skeleton className="h-3 w-3/4 rounded bg-zinc-800" />
        <Skeleton className="h-2.5 w-16 rounded bg-zinc-800" />
      </div>
      <Skeleton className="h-6 w-6 shrink-0 rounded bg-zinc-800" />
    </div>
  );
}

function ReadDivider() {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-zinc-900 px-2 text-xs text-zinc-600">Earlier</span>
      </div>
    </div>
  );
}

export function AlertsSheet({ open, onOpenChange }: AlertsSheetProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const result = await res.json();
      if (res.ok) {
        setAlerts(result.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open, fetchAlerts]);

  async function markAllAsRead() {
    try {
      const res = await fetch("/api/alerts", { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => ({ ...a, is_read: true }))
        );
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  function handleRead(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
  }

  function handleDismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const hasUnread = unreadCount > 0;
  const hasRead = alerts.some((a) => a.is_read);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "bg-zinc-900 border-zinc-800",
          isMobile
            ? "h-auto max-h-[85vh] rounded-t-2xl"
            : "w-full max-w-sm"
        )}
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-zinc-400 hover:text-white"
              >
                <CheckCheck className="mr-1.5 h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>
            {alerts.length === 0 && !loading
              ? "You're all caught up"
              : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-2 py-2">
            <AlertSkeleton />
            <AlertSkeleton />
            <AlertSkeleton />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
              <Bell className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-500">
              You're all caught up
            </p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto py-2">
            {alerts.map((alert, index) => {
              const prevAlert = alerts[index - 1];
              const showDivider =
                hasUnread &&
                hasRead &&
                prevAlert &&
                !prevAlert.is_read &&
                alert.is_read;

              return (
                <div key={alert.id} className="space-y-2">
                  {showDivider && <ReadDivider />}
                  <AlertItem
                    alert={alert}
                    onRead={handleRead}
                    onDismiss={handleDismiss}
                  />
                </div>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
