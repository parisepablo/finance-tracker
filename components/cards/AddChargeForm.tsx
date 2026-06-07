"use client";

import { useState, useEffect } from "react";
import { CreditCard, BudgetCategory } from "@/lib/types";
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
import { Switch } from "@/components/ui/switch";
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

interface AddChargeFormProps {
  card: CreditCard;
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
  totalInstallments?: string;
}

export function AddChargeForm({
  card,
  budgetCategories,
  onSuccess,
  trigger,
}: AddChargeFormProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("");
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
    setIsInstallment(false);
    setTotalInstallments("");
    setBudgetCategoryId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (isInstallment) {
      const installments = parseInt(totalInstallments, 10);
      if (isNaN(installments) || installments < 2) {
        newErrors.totalInstallments = "Total installments must be at least 2";
      }
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
      is_installment: isInstallment,
      total_installments: isInstallment ? parseInt(totalInstallments, 10) : undefined,
      budget_category_id: budgetCategoryId || undefined,
    };

    try {
      const res = await fetch(`/api/cards/${card.id}/charges`, {
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
        {trigger ?? <Button>Add Charge</Button>}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Charge to {card.name}</DialogTitle>
            <DialogDescription>
              Record a new purchase or installment plan on this card.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="charge-desc">Description</Label>
              <Input
                id="charge-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="e.g. TV, Flight tickets"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-rose-400">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="charge-amount">Total Amount</Label>
              <Input
                id="charge-amount"
                type="number"
                step="0.01"
                min="0.01"
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
              <Label htmlFor="budget-category">Budget Category</Label>
              <Select
                value={budgetCategoryId || "none"}
                onValueChange={(value) =>
                  setBudgetCategoryId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="budget-category">
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

            <div className="flex items-center gap-2">
              <Switch
                id="is_installment"
                checked={isInstallment}
                onCheckedChange={setIsInstallment}
              />
              <Label htmlFor="is_installment" className="cursor-pointer">
                This is an installment purchase
              </Label>
            </div>

            {isInstallment && (
              <div className="grid gap-2">
                <Label htmlFor="total-installments">Total Installments</Label>
                <Input
                id="total-installments"
                type="number"
                min={2}
                value={totalInstallments}
                className="font-mono"
                  onChange={(e) => {
                    setTotalInstallments(e.target.value);
                    if (errors.totalInstallments) setErrors((prev) => ({ ...prev, totalInstallments: undefined }));
                  }}
                  placeholder="e.g. 6"
                  required={isInstallment}
                  aria-invalid={!!errors.totalInstallments}
                />
                {errors.totalInstallments && (
                  <p className="text-xs text-rose-400">{errors.totalInstallments}</p>
                )}
              </div>
            )}
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
