"use client";

import { useState, useEffect } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreditCard, BudgetCategory } from "@/lib/types";

interface QuickAddChargeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
  totalInstallments?: string;
  cardId?: string;
}

export function QuickAddChargeSheet({
  open,
  onOpenChange,
  cards,
  budgetCategories,
  onSuccess,
}: QuickAddChargeSheetProps) {
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const hasMultipleCards = cards.length > 1;
  const selectedCard = cards.find((c) => c.id === cardId);

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
    // Auto-select card if only one exists
    if (cards.length === 1) {
      setCardId(cards[0].id);
    } else {
      setCardId("");
    }
  }, [open, cards]);

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

    if (hasMultipleCards && !cardId) {
      newErrors.cardId = "Select a card";
    }

    if (isInstallment) {
      const installments = parseInt(totalInstallments, 10);
      if (isNaN(installments) || installments < 2) {
        newErrors.totalInstallments = "At least 2 installments";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const targetCardId = hasMultipleCards ? cardId : cards[0]?.id;
    if (!targetCardId) {
      toast.error("No credit card available");
      return;
    }

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
      const res = await fetch(`/api/cards/${targetCardId}/charges`, {
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

      toast.success(`Charge "${payload.description}" added`);
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  }

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "bg-zinc-900",
          isMobile
            ? "h-auto max-h-[85vh] rounded-t-2xl border-t border-white/[0.06]"
            : "w-full max-w-sm border-l border-white/[0.06]"
        )}
      >
        <SheetHeader className="pb-2">
          <SheetTitle>New card charge</SheetTitle>
          <SheetDescription>
            {selectedCard
              ? `Adding to ${selectedCard.name}${selectedCard.last_four ? ` •••• ${selectedCard.last_four}` : ""}`
              : "Quickly add a new purchase to your credit card"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="quick-desc">Description</Label>
            <Input
              id="quick-desc"
              autoFocus
              placeholder="e.g. Groceries, Netflix"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
              }}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-rose-400">{errors.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-amount">Amount (ARS)</Label>
            <Input
              id="quick-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={totalAmount}
              className="font-mono"
              onChange={(e) => {
                setTotalAmount(e.target.value);
                if (errors.totalAmount) setErrors((p) => ({ ...p, totalAmount: undefined }));
              }}
              aria-invalid={!!errors.totalAmount}
            />
            {errors.totalAmount && (
              <p className="text-xs text-rose-400">{errors.totalAmount}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
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
                    if (errors.date) setErrors((p) => ({ ...p, date: undefined }));
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-xs text-rose-400">{errors.date}</p>
            )}
          </div>

          {hasMultipleCards && (
            <div className="space-y-1.5">
              <Label htmlFor="quick-card">Credit Card</Label>
              <Select
                value={cardId || "none"}
                onValueChange={(value) => {
                  setCardId(value === "none" ? "" : value);
                  if (errors.cardId) setErrors((p) => ({ ...p, cardId: undefined }));
                }}
              >
                <SelectTrigger id="quick-card" aria-invalid={!!errors.cardId}>
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select card</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.last_four ? (
                        <span className="font-mono">{` •••• ${c.last_four}`}</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cardId && (
                <p className="text-xs text-rose-400">{errors.cardId}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="quick-budget">Budget Category</Label>
            <Select
              value={budgetCategoryId || "none"}
              onValueChange={(value) =>
                setBudgetCategoryId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="quick-budget">
                <SelectValue placeholder="Optional" />
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
              id="quick-installment"
              checked={isInstallment}
              onCheckedChange={setIsInstallment}
            />
            <Label htmlFor="quick-installment" className="cursor-pointer text-sm">
              Installment purchase
            </Label>
          </div>

          {isInstallment && (
            <div className="space-y-1.5">
              <Label htmlFor="quick-installments">Installments</Label>
              <Input
                id="quick-installments"
                type="number"
                min={2}
                placeholder="e.g. 6"
                value={totalInstallments}
                className="font-mono"
                onChange={(e) => {
                  setTotalInstallments(e.target.value);
                  if (errors.totalInstallments) setErrors((p) => ({ ...p, totalInstallments: undefined }));
                }}
                aria-invalid={!!errors.totalInstallments}
              />
              {errors.totalInstallments && (
                <p className="text-xs text-rose-400">{errors.totalInstallments}</p>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Adding…" : "Add charge"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
