"use client";

import { useState, useEffect } from "react";
import { CreditCard } from "@/lib/types";
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
import { toast } from "sonner";

interface CreditCardFormProps {
  card?: CreditCard;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

interface FormErrors {
  name?: string;
  lastFour?: string;
  creditLimit?: string;
  closingDay?: string;
  dueDay?: string;
}

export function CreditCardForm({ card, onSuccess, trigger }: CreditCardFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(card?.name ?? "");
  const [lastFour, setLastFour] = useState(card?.last_four ?? "");
  const [creditLimit, setCreditLimit] = useState(
    card?.credit_limit_cents ? (card.credit_limit_cents / 100).toString() : ""
  );
  const [closingDay, setClosingDay] = useState(
    card?.closing_day ? card.closing_day.toString() : ""
  );
  const [dueDay, setDueDay] = useState(
    card?.due_day ? card.due_day.toString() : ""
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = !!card;

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setErrors({});
    if (card) {
      setName(card.name);
      setLastFour(card.last_four ?? "");
      setCreditLimit(card.credit_limit_cents ? (card.credit_limit_cents / 100).toString() : "");
      setClosingDay(card.closing_day ? card.closing_day.toString() : "");
      setDueDay(card.due_day ? card.due_day.toString() : "");
    } else {
      setName("");
      setLastFour("");
      setCreditLimit("");
      setClosingDay("");
      setDueDay("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (lastFour) {
      if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
        newErrors.lastFour = "Last four digits must be exactly 4 numbers";
      }
    }

    if (creditLimit) {
      const limitNum = parseFloat(creditLimit);
      if (isNaN(limitNum) || limitNum <= 0) {
        newErrors.creditLimit = "Credit limit must be greater than 0";
      }
    }

    if (closingDay) {
      const cd = parseInt(closingDay, 10);
      if (isNaN(cd) || cd < 1 || cd > 31) {
        newErrors.closingDay = "Closing day must be between 1 and 31";
      }
    }

    if (dueDay) {
      const dd = parseInt(dueDay, 10);
      if (isNaN(dd) || dd < 1 || dd > 31) {
        newErrors.dueDay = "Due day must be between 1 and 31";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
    };

    if (lastFour) {
      payload.last_four = lastFour;
    }

    if (creditLimit) {
      payload.credit_limit_cents = Math.round(parseFloat(creditLimit) * 100);
    }

    if (closingDay) {
      payload.closing_day = parseInt(closingDay, 10);
    }

    if (dueDay) {
      payload.due_day = parseInt(dueDay, 10);
    }

    try {
      const url = isEditing ? `/api/cards/${card.id}` : "/api/cards";
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
          ? `Credit card "${payload.name}" updated successfully`
          : `Credit card "${payload.name}" created successfully`
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
          <Button>{isEditing ? "Edit Card" : "Add Credit Card"}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Credit Card" : "Add Credit Card"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your credit card details."
                : "Add a new credit card to track charges and installments."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Card Name</Label>
              <Input
                id="card-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Visa Platinum"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-rose-400">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last-four">Last Four Digits</Label>
              <Input
                id="last-four"
                value={lastFour}
                className="font-mono"
                onChange={(e) => {
                  setLastFour(e.target.value);
                  if (errors.lastFour) setErrors((prev) => ({ ...prev, lastFour: undefined }));
                }}
                placeholder="1234"
                maxLength={4}
                aria-invalid={!!errors.lastFour}
              />
              {errors.lastFour && (
                <p className="text-xs text-rose-400">{errors.lastFour}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="credit-limit">Credit Limit</Label>
              <Input
                id="credit-limit"
                type="number"
                step="0.01"
                min="0.01"
                value={creditLimit}
                className="font-mono"
                onChange={(e) => {
                  setCreditLimit(e.target.value);
                  if (errors.creditLimit) setErrors((prev) => ({ ...prev, creditLimit: undefined }));
                }}
                placeholder="0.00"
                aria-invalid={!!errors.creditLimit}
              />
              {errors.creditLimit && (
                <p className="text-xs text-rose-400">{errors.creditLimit}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="closing-day">Closing Day (1–31)</Label>
                <Input
                id="closing-day"
                type="number"
                min={1}
                max={31}
                value={closingDay}
                className="font-mono"
                  onChange={(e) => {
                    setClosingDay(e.target.value);
                    if (errors.closingDay) setErrors((prev) => ({ ...prev, closingDay: undefined }));
                  }}
                  placeholder="e.g. 15"
                  aria-invalid={!!errors.closingDay}
                />
                {errors.closingDay && (
                  <p className="text-xs text-rose-400">{errors.closingDay}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-day">Due Day (1–31)</Label>
                <Input
                id="due-day"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                className="font-mono"
                  onChange={(e) => {
                    setDueDay(e.target.value);
                    if (errors.dueDay) setErrors((prev) => ({ ...prev, dueDay: undefined }));
                  }}
                  placeholder="e.g. 25"
                  aria-invalid={!!errors.dueDay}
                />
                {errors.dueDay && (
                  <p className="text-xs text-rose-400">{errors.dueDay}</p>
                )}
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
