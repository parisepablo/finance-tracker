"use client";

import { useState, useEffect } from "react";
import { BudgetCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface EditChargeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  chargeId: string | null;
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
  totalInstallments?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount_cents: number;
  date: string;
  budget_category_id: string | null;
  is_installment: boolean;
  total_installments: number | null;
  current_installment: number | null;
  credit_card_id: string;
}

export function EditChargeSheet({
  open,
  onOpenChange,
  cardId,
  chargeId,
  budgetCategories,
  onSuccess,
}: EditChargeSheetProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [related, setRelated] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!open || !chargeId) {
      setTransaction(null);
      setRelated([]);
      return;
    }

    setLoading(true);
    setErrors({});

    fetch(`/api/cards/${cardId}/charges`)
      .then((res) => res.json())
      .then((result) => {
        if (!result.data) {
          toast.error("Failed to load charge data");
          return;
        }
        const all = result.data as Transaction[];
        const tx = all.find((t) => t.id === chargeId);
        if (!tx) {
          toast.error("Charge not found");
          return;
        }

        setTransaction(tx);
        setDescription(tx.description);
        // For installments, compute the original purchase date so the backend recreates
        // all installments from the correct starting month.
        if (tx.is_installment && tx.current_installment && tx.current_installment > 1) {
          const originalDate = new Date(tx.date);
          originalDate.setMonth(originalDate.getMonth() - (tx.current_installment - 1));
          setDate(originalDate);
        } else {
          setDate(new Date(tx.date));
        }
        setIsInstallment(tx.is_installment);
        setBudgetCategoryId(tx.budget_category_id ?? "");
        setTotalInstallments(
          tx.total_installments ? String(tx.total_installments) : ""
        );

        if (tx.is_installment && tx.total_installments) {
          const series = all.filter(
            (t) =>
              t.is_installment &&
              t.total_installments === tx.total_installments &&
              t.description === tx.description
          );
          setRelated(series);
          const total = series.reduce((sum, t) => sum + t.amount_cents, 0);
          setTotalAmount((total / 100).toFixed(2));
        } else {
          setTotalAmount((tx.amount_cents / 100).toFixed(2));
          setRelated([]);
        }
      })
      .catch(() => {
        toast.error("Network error. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [open, chargeId, cardId]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!description.trim()) {
      newErrors.description = "Description is required";
    }

    const amountNum = parseFloat(totalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.totalAmount = "Amount must be greater than 0";
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
    if (!validate() || !transaction) return;

    setSaving(true);

    const amountNum = parseFloat(totalAmount);
    const payload: Record<string, unknown> = {
      description: description.trim(),
      total_amount_cents: Math.round(amountNum * 100),
      date: date!.toISOString().split("T")[0],
      is_installment: isInstallment,
      total_installments: isInstallment
        ? parseInt(totalInstallments, 10)
        : undefined,
      budget_category_id: budgetCategoryId || undefined,
    };

    try {
      const res = await fetch(
        `/api/cards/${cardId}/charges/${transaction.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Something went wrong");
        setSaving(false);
        return;
      }

      toast.success("Charge updated successfully");
      haptics.success();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
      setSaving(false);
    }
  }

  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "bg-zinc-900",
          isMobile
            ? "h-auto max-h-[85vh] rounded-t-2xl border-t border-zinc-800"
            : "w-full max-w-sm border-l border-zinc-800"
        )}
      >
        <SheetHeader className="pb-2">
          <SheetTitle>Edit charge</SheetTitle>
          <SheetDescription>
            Update this charge&apos;s details.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description)
                    setErrors((p) => ({ ...p, description: undefined }));
                }}
                placeholder="e.g. TV, Flight tickets"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-xs text-rose-400">{errors.description}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">
                {isInstallment ? "Total Amount" : "Amount"} (ARS)
              </Label>
              <Input
                id="edit-amount"
                type="text"
                inputMode="decimal"
                value={totalAmount}
                className="font-mono"
                onChange={(e) => {
                  setTotalAmount(e.target.value);
                  if (errors.totalAmount)
                    setErrors((p) => ({ ...p, totalAmount: undefined }));
                }}
                placeholder="0.00"
                aria-invalid={!!errors.totalAmount}
              />
              {errors.totalAmount && (
                <p className="text-xs text-rose-400">{errors.totalAmount}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Popover modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    aria-invalid={!!errors.date}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="font-mono">
                      {date ? format(date, "PPP") : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      if (errors.date)
                        setErrors((p) => ({ ...p, date: undefined }));
                    }}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-xs text-rose-400">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-budget">Budget Category</Label>
              <Select
                value={budgetCategoryId || "none"}
                onValueChange={(value) =>
                  setBudgetCategoryId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="edit-budget">
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
                id="edit-installment"
                checked={isInstallment}
                onCheckedChange={setIsInstallment}
              />
              <Label htmlFor="edit-installment" className="cursor-pointer">
                This is an installment purchase
              </Label>
            </div>

            {isInstallment && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-total-installments">
                  Total Installments
                </Label>
                <Input
                  id="edit-total-installments"
                  type="text"
                  inputMode="numeric"
                  value={totalInstallments}
                  className="font-mono"
                  onChange={(e) => {
                    setTotalInstallments(e.target.value);
                    if (errors.totalInstallments)
                      setErrors((p) => ({
                        ...p,
                        totalInstallments: undefined,
                      }));
                  }}
                  placeholder="e.g. 6"
                  required={isInstallment}
                  aria-invalid={!!errors.totalInstallments}
                />
                {errors.totalInstallments && (
                  <p className="text-xs text-rose-400">
                    {errors.totalInstallments}
                  </p>
                )}
              </div>
            )}

            {isInstallment && related.length > 1 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                Editing an installment charge will update all{" "}
                {related.length} installments in this series.
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
