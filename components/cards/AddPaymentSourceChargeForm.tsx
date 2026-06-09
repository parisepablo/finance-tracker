"use client";

import { useState, useEffect } from "react";
import { PaymentSource, BudgetCategory } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AddPaymentSourceChargeFormProps {
  source: PaymentSource;
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
}

export function AddPaymentSourceChargeForm({
  source,
  budgetCategories,
  onSuccess,
  trigger,
}: AddPaymentSourceChargeFormProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setErrors({});
    setDescription("");
    setTotalAmount("");
    setDate(new Date());
    setBudgetCategoryId("");
  }, [open]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    const amountNum = parseFloat(totalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.totalAmount = "Total amount must be greater than 0";
    }

    if (!date) {
      newErrors.date = "Purchase date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const amountNum = parseFloat(totalAmount);

    const payload: Record<string, unknown> = {
      description: description.trim(),
      total_amount_cents: Math.round(amountNum * 100),
      date: date!.toISOString().split("T")[0],
      is_installment: false,
      budget_category_id: budgetCategoryId || undefined,
      payment_source_id: source.id,
    };

    try {
      // Use a fallback card ID since the backend ignores it when payment_source_id is present
      const fallbackCardId = "00000000-0000-0000-0000-000000000000";
      const res = await fetch(`/api/cards/${fallbackCardId}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Something went wrong");
        setLoading(false);
        return;
      }

      toast.success(`Charge "${payload.description}" added successfully`);
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
        {trigger ?? <Button>+ Charge</Button>}
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Charge to {source.name}</DialogTitle>
            <DialogDescription>
              Record a new purchase using this payment source.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-3 py-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
              Payment source: <span className="font-medium text-white">{source.name}</span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-charge-desc">Description</Label>
              <Input
                id="ps-charge-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="e.g. Groceries, Netflix"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-rose-400">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-charge-amount">Total Amount</Label>
              <Input
                id="ps-charge-amount"
                type="text"
                inputMode="decimal"
                value={totalAmount}
                className="font-mono"
                onChange={(e) => {
                  setTotalAmount(e.target.value);
                  if (errors.totalAmount) setErrors((prev) => ({ ...prev, totalAmount: undefined }));
                }}
                placeholder="0.00"
                aria-invalid={!!errors.totalAmount}
              />
              {errors.totalAmount && (
                <p className="text-xs text-rose-400">{errors.totalAmount}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Purchase Date</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    aria-invalid={!!errors.date}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="font-mono">{date ? format(date, "PPP") : "Pick a date"}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                    }}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-xs text-rose-400">{errors.date}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ps-budget-category">Budget Category</Label>
              <Select
                value={budgetCategoryId || "none"}
                onValueChange={(value) =>
                  setBudgetCategoryId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="ps-budget-category">
                  <SelectValue placeholder="Select budget category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {budgetCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Charge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
