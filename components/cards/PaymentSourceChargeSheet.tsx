"use client";

import { useState, useEffect } from "react";
import { BudgetCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

interface PaymentSourceChargeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargeId: string | null;
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
}

interface Transaction {
  id: string;
  description: string;
  amount_cents: number;
  date: string;
  budget_category_id: string | null;
  payment_source_id: string | null;
  is_installment: boolean;
  total_installments: number | null;
  current_installment: number | null;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
}

export function PaymentSourceChargeSheet({
  open,
  onOpenChange,
  chargeId,
  budgetCategories,
  onSuccess,
}: PaymentSourceChargeSheetProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>();
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
      return;
    }

    setLoading(true);
    setErrors({});

    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("transactions")
          .select("id, description, amount_cents, date, budget_category_id, payment_source_id, is_installment, total_installments, current_installment")
          .eq("id", chargeId)
          .single();

        if (error || !data) {
          toast.error("Charge not found");
          setLoading(false);
          return;
        }

        const tx = data as Transaction;
        setTransaction(tx);
        setDescription(tx.description);
        setDate(new Date(tx.date));
        setBudgetCategoryId(tx.budget_category_id ?? "");
        setTotalAmount((tx.amount_cents / 100).toFixed(2));
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open, chargeId]);

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
      newErrors.date = "Date is required";
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
      is_installment: false,
      budget_category_id: budgetCategoryId || undefined,
      payment_source_id: transaction.payment_source_id,
    };

    try {
      const res = await fetch(
        `/api/cards/00000000-0000-0000-0000-000000000000/charges/${transaction.id}`,
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
          "bg-[#0f0c19]",
          isMobile
            ? "h-auto max-h-[85vh] rounded-t-2xl border-t border-[#18122B]"
            : "w-full max-w-sm border-l border-[#18122B]"
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
              <Label htmlFor="ps-edit-desc">Description</Label>
              <Input
                id="ps-edit-desc"
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
              <Label htmlFor="ps-edit-amount">Amount (ARS)</Label>
              <Input
                id="ps-edit-amount"
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
              <Label htmlFor="ps-edit-budget">Budget Category</Label>
              <Select
                value={budgetCategoryId || "none"}
                onValueChange={(value) =>
                  setBudgetCategoryId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="ps-edit-budget">
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
