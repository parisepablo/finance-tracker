"use client";

import { useState, useEffect } from "react";
import { IncomeSource } from "@/lib/types";
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
import { toast } from "sonner";
import { getCurrentMonth } from "@/lib/utils";

interface IncomeFormProps {
  income?: IncomeSource;
  onSuccess: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultMonth?: string;
}

interface FormErrors {
  name?: string;
  amount?: string;
}

export function IncomeForm({ income, onSuccess, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultMonth }: IncomeFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [name, setName] = useState(income?.name ?? "");
  const [amount, setAmount] = useState(
    income ? (income.amount_cents / 100).toString() : ""
  );
  const [isActive, setIsActive] = useState(income?.is_active ?? true);
  const [currency, setCurrency] = useState<"ARS" | "USD">(
    income?.currency ?? "ARS"
  );
  const [month, setMonth] = useState(income?.month ?? defaultMonth ?? getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = !!income;

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setErrors({});
    if (income) {
      setName(income.name);
      setAmount((income.amount_cents / 100).toString());
      setIsActive(income.is_active);
      setCurrency(income.currency);
      setMonth(income.month);
    } else {
      setName("");
      setAmount("");
      setIsActive(true);
      setCurrency("ARS");
      setMonth(defaultMonth ?? getCurrentMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const amountNum = parseFloat(amount);
    const amountCents = Math.round(amountNum * 100);
    const payload = {
      name: name.trim(),
      amount_cents: amountCents,
      currency,
      is_active: isActive,
      month,
    };

    try {
      const url = isEditing ? `/api/income/${income.id}` : "/api/income";
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
          ? `Income source "${payload.name}" updated successfully`
          : `Income source "${payload.name}" created successfully`
      );
      setOpen(false);
      setName("");
      setAmount("");
      setIsActive(true);
      setCurrency("ARS");
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
          <Button>{isEditing ? "Edit Income" : "Add Income Source"}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Income Source" : "Add Income Source"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details of this income source."
                : "Add a new monthly income source to your budget."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Salary, Freelance"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-rose-400">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Monthly Amount</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                className="font-mono"
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="0.00"
                aria-invalid={!!errors.amount}
              />
              {errors.amount && (
                <p className="text-xs text-rose-400">{errors.amount}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(value: "ARS" | "USD") => setCurrency(value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS ($)</SelectItem>
                  <SelectItem value="USD">USD (US$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                className="font-mono"
                onChange={(e) => {
                  setMonth(e.target.value);
                }}
              />
              <p className="text-xs text-zinc-500">
                This income applies to this month only.
              </p>
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
