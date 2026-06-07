"use client";

import { Alert, AlertType } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import {
  Calendar,
  PieChart,
  CreditCard,
  Clock,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AlertItemProps {
  alert: Alert;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const priorityConfig = {
  critical: {
    border: "border-l-rose-500",
    bg: "bg-rose-500/10",
    dot: "bg-rose-500",
  },
  high: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
  },
  medium: {
    border: "border-l-indigo-500",
    bg: "bg-indigo-500/10",
    dot: "bg-indigo-500",
  },
  low: {
    border: "border-l-zinc-600",
    bg: "",
    dot: "bg-zinc-600",
  },
};

const typeIcons: Record<AlertType, React.ReactNode> = {
  DUE_DATE_UPCOMING: <Calendar className="h-4 w-4" />,
  DUE_DATE_TODAY: <Calendar className="h-4 w-4" />,
  BUDGET_WARNING: <PieChart className="h-4 w-4" />,
  BUDGET_EXCEEDED: <PieChart className="h-4 w-4" />,
  CREDIT_CARD_CLOSING_SOON: <CreditCard className="h-4 w-4" />,
  CREDIT_CARD_PAYMENT_DUE: <CreditCard className="h-4 w-4" />,
  HIGH_FIXED_EXPENSE_RATIO: <PieChart className="h-4 w-4" />,
  UNLOGGED_ACTIVITY: <Clock className="h-4 w-4" />,
};

export function AlertItem({ alert, onRead, onDismiss }: AlertItemProps) {
  const config = priorityConfig[alert.priority];

  async function handleRead() {
    if (alert.is_read) return;
    haptics.light();
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "PATCH",
      });
      if (res.ok) {
        onRead(alert.id);
      }
    } catch {
      // silent
    }
  }

  async function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/alerts/${alert.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDismiss(alert.id);
      }
    } catch {
      // silent
    }
  }

  return (
    <button
      onClick={handleRead}
      className={`group relative flex w-full items-start gap-3 rounded-lg border border-zinc-800 border-l-4 p-3 text-left transition-colors hover:bg-zinc-800/50 ${config.border} ${config.bg} ${
        alert.is_read ? "opacity-60" : ""
      }`}
    >
      {!alert.is_read && (
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${config.dot}`}
        />
      )}
      {alert.is_read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-zinc-700" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">{typeIcons[alert.type]}</span>
          <p
            className={`text-sm font-medium ${
              alert.is_read ? "text-zinc-400" : "text-white"
            }`}
          >
            {alert.title}
          </p>
        </div>
        <p className="mt-0.5 text-sm text-zinc-400 leading-relaxed">
          {alert.message}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          {formatDistanceToNow(new Date(alert.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </button>
  );
}
