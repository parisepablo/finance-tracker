"use client";

import { useState } from "react";
import { BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { GlowCard } from "@/components/ui/glow-card";
import { Button } from "@/components/ui/button";
import { BudgetCategoryForm } from "./BudgetCategoryForm";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { Pencil, Trash2, PieChart } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface BudgetCategoryListProps {
  categories: BudgetCategoryWithStats[];
  discretionaryPoolCents: number;
  onRefresh: () => void;
}

function getExistingTotalForEdit(
  allCategories: BudgetCategoryWithStats[],
  editingId: string
): number {
  return allCategories.reduce(
    (sum, cat) => sum + (cat.id === editingId ? 0 : cat.percentage),
    0
  );
}

export function BudgetCategoryList({
  categories,
  discretionaryPoolCents,
  onRefresh,
}: BudgetCategoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<BudgetCategoryWithStats | null>(null);

  function openDeleteDialog(item: BudgetCategoryWithStats) {
    setConfirmItem(item);
    setConfirmOpen(true);
    setError(null);
    haptics.medium();
  }

  async function handleDelete() {
    if (!confirmItem) return;

    setDeletingId(confirmItem.id);
    setError(null);

    try {
      const res = await fetch(`/api/budgets/${confirmItem.id}`, { method: "DELETE" });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to delete category");
        toast.error(result.error || "Failed to delete category");
        setDeletingId(null);
        return;
      }

      toast.success(`Budget category "${confirmItem.name}" deleted`);
      haptics.light();
      setConfirmOpen(false);
      setConfirmItem(null);
      onRefresh();
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
      setDeletingId(null);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/60">
          <PieChart className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No budget categories yet</p>
          <p className="text-sm text-zinc-500">
            Add your first category to start tracking your variable spending.
          </p>
        </div>
        <BudgetCategoryForm
          discretionaryPoolCents={discretionaryPoolCents}
          onSuccess={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 relative z-10">
      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {categories.map((cat) => {
        const barWidth = Math.min(cat.spent_percentage, 100);
        let barColor = cat.color || "#10b981";
        if (cat.spent_percentage >= 100) {
          barColor = "#f43f5e";
        } else if (cat.spent_percentage >= 80) {
          barColor = "#f59e0b";
        }

        return (
          <GlowCard key={cat.id} color="indigo">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}26` }}
                  />
                  <span className="font-medium text-zinc-200">{cat.name}</span>
                  <span className="text-sm text-zinc-500 font-mono">
                    {cat.percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BudgetCategoryForm
                    category={cat}
                    discretionaryPoolCents={discretionaryPoolCents}
                    existingTotalPercentage={getExistingTotalForEdit(
                      categories,
                      cat.id
                    )}
                    onSuccess={onRefresh}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-white hover:bg-zinc-800"
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
                    onClick={() => openDeleteDialog(cat)}
                    className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 font-mono">
                  Allocated: {formatCurrency(cat.allocated_cents)}
                </span>
                <span className="text-zinc-500 font-mono">
                  {cat.spent_percentage}% spent
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full progress-shimmer animate-progress"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                    boxShadow: `0 0 10px ${barColor}26`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400 font-mono">Spent: {formatCurrency(cat.spent_cents)}</span>
                <span
                  className={
                    cat.remaining_cents < 0
                      ? "text-rose-400 font-mono"
                      : "text-zinc-500 font-mono"
                  }
                >
                  Remaining: {formatCurrency(cat.remaining_cents)}
                </span>
              </div>
            </div>
          </GlowCard>
        );
      })}

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        title="Delete Budget Category"
        description="This will permanently delete"
        itemName={confirmItem?.name ?? ""}
        isLoading={!!deletingId}
      />
    </div>
  );
}
