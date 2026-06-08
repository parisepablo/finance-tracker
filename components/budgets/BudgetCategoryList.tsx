"use client";

import { useState } from "react";
import { BudgetCategoryWithStats } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { GlowCard } from "@/components/ui/glow-card";
import { Button } from "@/components/ui/button";
import { BudgetCategoryForm } from "./BudgetCategoryForm";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, PieChart, MoreVertical } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetCategoryWithStats | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<BudgetCategoryWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deletingBudget) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets/${deletingBudget.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to delete budget");
        toast.error(result.error || "Failed to delete budget");
        setIsDeleting(false);
        return;
      }
      toast.success("Budget deleted");
      haptics.light();
      setDeletingBudget(null);
      onRefresh();
    } catch {
      setError("Failed to delete budget");
      toast.error("Failed to delete budget");
      setIsDeleting(false);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <PieChart className="h-6 w-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-zinc-300">No budget categories yet</p>
          <p className="text-sm text-zinc-500">
            Add your first category to start tracking your variable spending.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingBudget(null);
            setFormOpen(true);
          }}
          className="min-h-[44px]"
        >
          New Budget
        </Button>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label="Opciones"
                        className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingBudget(cat);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setDeletingBudget(cat);
                          haptics.medium();
                        }}
                        className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 font-mono">
                  Allocated: <Amount value={cat.allocated_cents} className="font-mono" />
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
                <span className="text-zinc-400 font-mono">Spent: <Amount value={cat.spent_cents} className="font-mono" /></span>
                <span
                  className={
                    cat.remaining_cents < 0
                      ? "text-rose-400 font-mono"
                      : "text-zinc-500 font-mono"
                  }
                >
                  Remaining: <Amount value={cat.remaining_cents} className="font-mono" />
                </span>
              </div>
            </div>
          </GlowCard>
        );
      })}

      <BudgetCategoryForm
        category={editingBudget ?? undefined}
        discretionaryPoolCents={discretionaryPoolCents}
        existingTotalPercentage={
          editingBudget
            ? getExistingTotalForEdit(categories, editingBudget.id)
            : categories.reduce((sum, cat) => sum + cat.percentage, 0)
        }
        onSuccess={onRefresh}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBudget(null);
        }}
        trigger={null}
      />

      <AlertDialog open={!!deletingBudget} onOpenChange={(open) => { if (!open) setDeletingBudget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The budget &quot;{deletingBudget?.name}&quot; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingBudget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
