"use client";

import { useState, useEffect } from "react";
import { BudgetCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

interface BudgetCategoryFormProps {
  category?: BudgetCategory;
  discretionaryPoolCents: number;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
];

export function BudgetCategoryForm({
  category,
  discretionaryPoolCents,
  onSuccess,
  trigger,
}: BudgetCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [percentage, setPercentage] = useState(
    category?.percentage ? category.percentage.toString() : ""
  );
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[7]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setError(null);
    if (category) {
      setName(category.name);
      setPercentage(category.percentage.toString());
      setColor(category.color);
    } else {
      setName("");
      setPercentage("");
      setColor(PRESET_COLORS[7]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const previewAllocated =
    discretionaryPoolCents > 0 && percentage
      ? Math.round((discretionaryPoolCents * parseInt(percentage || "0", 10)) / 100)
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const pct = parseInt(percentage, 10);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError("Percentage must be between 1 and 100");
      setLoading(false);
      return;
    }

    const payload = {
      name: name.trim(),
      percentage: pct,
      color,
    };

    try {
      const url = isEditing
        ? `/api/budgets/${category.id}`
        : "/api/budgets";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setOpen(false);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            {isEditing ? "Edit Category" : "Add Budget Category"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Budget Category" : "Add Budget Category"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update this budget category."
                : "Create a new variable budget category as a percentage of your discretionary pool."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries, Entertainment"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-percentage">Percentage (1–100)</Label>
              <Input
                id="budget-percentage"
                type="number"
                min={1}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="e.g. 20"
                required
              />
            </div>

            {discretionaryPoolCents > 0 && percentage && !isNaN(parseInt(percentage, 10)) && (
              <p className="text-sm text-muted-foreground">
                This gives you{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(previewAllocated)}
                </span>{" "}
                / month based on your current discretionary pool of{" "}
                {formatCurrency(discretionaryPoolCents)}.
              </p>
            )}

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-8 w-8 rounded-full ring-offset-2 transition-all"
                    style={{
                      backgroundColor: c,
                      boxShadow:
                        color === c
                          ? `0 0 0 2px white, 0 0 0 4px ${c}`
                          : "none",
                    }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
