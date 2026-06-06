"use client";

import { useState } from "react";
import { FixedExpense, CreditCard } from "@/lib/types";
import { formatCurrency, getMonthlyEquivalent } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FixedExpenseForm } from "./FixedExpenseForm";
import {
  Pencil,
  Trash2,
  Home,
  Tv,
  Car,
  HeartPulse,
  GraduationCap,
  CircleDot,
  Calendar,
} from "lucide-react";

interface FixedExpenseListProps {
  expenses: FixedExpense[];
  creditCards: CreditCard[];
  onRefresh: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Housing: <Home className="h-4 w-4" />,
  Subscriptions: <Tv className="h-4 w-4" />,
  Transport: <Car className="h-4 w-4" />,
  Health: <HeartPulse className="h-4 w-4" />,
  Education: <GraduationCap className="h-4 w-4" />,
  Other: <CircleDot className="h-4 w-4" />,
};

const categoryOrder = [
  "Housing",
  "Subscriptions",
  "Transport",
  "Health",
  "Education",
  "Other",
];

export function FixedExpenseList({
  expenses,
  creditCards,
  onRefresh,
}: FixedExpenseListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this fixed expense?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete fixed expense");
        setDeletingId(null);
        return;
      }

      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>No fixed expenses yet.</p>
        <p className="text-sm">Add your first fixed expense to get started.</p>
      </div>
    );
  }

  const grouped = expenses.reduce<Record<string, FixedExpense[]>>((acc, expense) => {
    const cat = expense.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(expense);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {categoryOrder.map((category) => {
        const items = grouped[category];
        if (!items || items.length === 0) return null;

        return (
          <div key={category}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {categoryIcons[category] ?? <CircleDot className="h-4 w-4" />}
              <span>{category}</span>
            </div>
            <div className="space-y-2">
              {items.map((expense) => {
                const monthlyCents = getMonthlyEquivalent(
                  expense.amount_cents,
                  expense.billing_cycle
                );
                const cycleLabel =
                  expense.billing_cycle === "quarterly"
                    ? "Quarterly ÷3"
                    : expense.billing_cycle === "annual"
                      ? "Annual ÷12"
                      : "Monthly";

                return (
                  <Card
                    key={expense.id}
                    className={!expense.is_active ? "opacity-50" : undefined}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-muted-foreground">
                          {categoryIcons[expense.category] ?? (
                            <CircleDot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{expense.name}</span>
                            <Badge
                              variant={expense.is_active ? "default" : "secondary"}
                            >
                              {expense.is_active ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {expense.due_day && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due day {expense.due_day}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {cycleLabel}
                            </Badge>
                            {expense.payment_method === "credit_card" && (
                              <Badge variant="outline" className="text-xs">
                                Credit Card
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">
                            {expense.is_estimated && (
                              <span className="text-muted-foreground">~ </span>
                            )}
                            {formatCurrency(monthlyCents)}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              / mo
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(expense.amount_cents)}{" "}
                            {expense.billing_cycle === "monthly"
                              ? "/ mo"
                              : expense.billing_cycle === "quarterly"
                                ? "/ qtr"
                                : "/ yr"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <FixedExpenseForm
                            expense={expense}
                            creditCards={creditCards}
                            onSuccess={onRefresh}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            disabled={deletingId === expense.id}
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
