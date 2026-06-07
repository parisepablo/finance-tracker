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
import { toast } from "sonner";

interface BudgetCategoryFormProps {
  category?: BudgetCategory;
  discretionaryPoolCents: number;
  existingTotalPercentage?: number;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

interface FormErrors {
  name?: string;
  percentage?: string;
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
  existingTotalPercentage = 0,
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
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = !!category;

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setErrors({});
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
      ? Math.round(
          (discretionaryPoolCents * parseInt(percentage || "0", 10)) / 100
        )
      : 0;

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const pct = parseInt(percentage, 10);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      newErrors.percentage = "Percentage must be between 1 and 100";
    } else {
      const projectedTotal = existingTotalPercentage + pct;
      if (projectedTotal > 100) {
        newErrors.percentage = `This would bring the total allocation to ${projectedTotal}%. The maximum is 100%.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const pct = parseInt(percentage, 10);
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
        toast.error(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      toast.success(
        isEditing
          ? `Budget category "${payload.name}" updated successfully`
          : `Budget category "${payload.name}" created successfully`
      );
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
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
            <div className="grid gap-2">
              <Label htmlFor="budget-name">Name</Label>
              <Input
                id="budget-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Groceries, Entertainment"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-rose-400">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-percentage">Percentage (1–100)</Label>
              <Input
                id="budget-percentage"
                type="number"
                min={1}
                max={100}
                value={percentage}
                className="font-mono"
                onChange={(e) => {
                  setPercentage(e.target.value);
                  if (errors.percentage) setErrors((prev) => ({ ...prev, percentage: undefined }));
                }}
                placeholder="e.g. 20"
                aria-invalid={!!errors.percentage}
              />
              {errors.percentage && (
                <p className="text-xs text-rose-400">{errors.percentage}</p>
              )}
            </div>

            {discretionaryPoolCents > 0 &&
              percentage &&
              !isNaN(parseInt(percentage, 10)) && (
              <p className="text-sm text-muted-foreground">
                This gives you{" "}
                <span className="font-medium text-foreground font-mono">
                  {formatCurrency(previewAllocated)}
                </span>{" "}
                <span className="font-sans">/ month</span>{" "}
                based on your current discretionary pool of{" "}
                <span className="font-mono">{formatCurrency(discretionaryPoolCents)}</span>.
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
