"use client";

import { useState } from "react";
import { BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BudgetCategoryForm } from "./BudgetCategoryForm";
import { Pencil, Trash2 } from "lucide-react";

interface BudgetCategoryListProps {
  categories: BudgetCategoryWithStats[];
  discretionaryPoolCents: number;
  onRefresh: () => void;
}

export function BudgetCategoryList({
  categories,
  discretionaryPoolCents,
  onRefresh,
}: BudgetCategoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this budget category?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete category");
        setDeletingId(null);
        return;
      }

      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>No budget categories yet.</p>
        <p className="text-sm">
          Add your first category to start tracking your variable spending.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {categories.map((cat) => {
        const barWidth = Math.min(cat.spent_percentage, 100);
        let barColor = "bg-emerald-500";
        if (cat.spent_percentage >= 100) {
          barColor = "bg-red-500";
        } else if (cat.spent_percentage >= 80) {
          barColor = "bg-amber-500";
        }

        return (
          <Card key={cat.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {cat.percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BudgetCategoryForm
                    category={cat}
                    discretionaryPoolCents={discretionaryPoolCents}
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
                    disabled={deletingId === cat.id}
                    onClick={() => handleDelete(cat.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Allocated: {formatCurrency(cat.allocated_cents)}
                </span>
                <span className="text-muted-foreground">
                  {cat.spent_percentage}% spent
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>
                  Spent: {formatCurrency(cat.spent_cents)}
                </span>
                <span
                  className={
                    cat.remaining_cents < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }
                >
                  Remaining: {formatCurrency(cat.remaining_cents)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
