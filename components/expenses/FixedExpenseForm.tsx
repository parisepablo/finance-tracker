"use client";

import { useState, useEffect } from "react";
import { FixedExpense, CreditCard } from "@/lib/types";
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

interface FixedExpenseFormProps {
  expense?: FixedExpense;
  creditCards: CreditCard[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

const categories = [
  "Housing",
  "Subscriptions",
  "Transport",
  "Health",
  "Education",
  "Other",
];

export function FixedExpenseForm({
  expense,
  creditCards,
  onSuccess,
  trigger,
}: FixedExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(expense?.name ?? "");
  const [category, setCategory] = useState(expense?.category ?? "Other");
  const [amount, setAmount] = useState(
    expense ? (expense.amount_cents / 100).toString() : ""
  );
  const [isEstimated, setIsEstimated] = useState(expense?.is_estimated ?? false);
  const [dueDay, setDueDay] = useState(
    expense?.due_day ? expense.due_day.toString() : ""
  );
  const [billingCycle, setBillingCycle] = useState<
    "monthly" | "quarterly" | "annual"
  >(expense?.billing_cycle ?? "monthly");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "debit" | "credit_card"
  >(expense?.payment_method ?? "debit");
  const [creditCardId, setCreditCardId] = useState(
    expense?.credit_card_id ?? ""
  );
  const [isActive, setIsActive] = useState(expense?.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!expense;

  useEffect(() => {
    if (paymentMethod !== "credit_card") {
      setCreditCardId("");
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setError(null);
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setAmount((expense.amount_cents / 100).toString());
      setIsEstimated(expense.is_estimated);
      setDueDay(expense.due_day ? expense.due_day.toString() : "");
      setBillingCycle(expense.billing_cycle);
      setPaymentMethod(expense.payment_method);
      setCreditCardId(expense.credit_card_id ?? "");
      setIsActive(expense.is_active);
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number");
      setLoading(false);
      return;
    }

    const amountCents = Math.round(amountNum * 100);

    const dueDayNum = dueDay ? parseInt(dueDay, 10) : undefined;
    if (dueDayNum !== undefined && (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31)) {
      setError("Due day must be between 1 and 31");
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      category,
      amount_cents: amountCents,
      is_estimated: isEstimated,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      is_active: isActive,
    };

    if (dueDayNum !== undefined) {
      payload.due_day = dueDayNum;
    }

    if (paymentMethod === "credit_card" && creditCardId) {
      payload.credit_card_id = creditCardId;
    } else {
      payload.credit_card_id = null;
    }

    try {
      const url = isEditing ? `/api/expenses/${expense.id}` : "/api/expenses";
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
      resetForm();
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setCategory("Other");
    setAmount("");
    setIsEstimated(false);
    setDueDay("");
    setBillingCycle("monthly");
    setPaymentMethod("debit");
    setCreditCardId("");
    setIsActive(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            {isEditing ? "Edit Expense" : "Add Fixed Expense"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Fixed Expense" : "Add Fixed Expense"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details of this fixed expense."
                : "Add a new fixed expense to track your recurring costs."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="expense-name">Name</Label>
              <Input
                id="expense-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rent, Netflix, Gym"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the full amount for the selected billing cycle.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <Select
                value={billingCycle}
                onValueChange={(value: "monthly" | "quarterly" | "annual") =>
                  setBillingCycle(value)
                }
              >
                <SelectTrigger id="billing-cycle">
                  <SelectValue placeholder="Select billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="due-day">Due Day (1–31)</Label>
              <Input
                id="due-day"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: "cash" | "debit" | "credit_card") =>
                  setPaymentMethod(value)
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "credit_card" && (
              <div className="grid gap-2">
                <Label htmlFor="credit-card">Credit Card</Label>
                <Select
                  value={creditCardId || "none"}
                  onValueChange={(value) =>
                    setCreditCardId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger id="credit-card">
                    <SelectValue placeholder="Select credit card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                        {card.last_four ? ` •••• ${card.last_four}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="is_estimated"
                checked={isEstimated}
                onCheckedChange={setIsEstimated}
              />
              <Label htmlFor="is_estimated" className="cursor-pointer">
                Amount is estimated
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
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
