"use client";

import { useState, useEffect } from "react";
import { CreditCard, BillingCycle } from "@/lib/types";
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
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { nextDueDate } from "@/lib/billing-cycles";
import { updateCycle } from "@/lib/actions/billing-cycles";

interface CreditCardFormProps {
  card?: CreditCard;
  cycles?: BillingCycle[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface FormErrors {
  name?: string;
  lastFour?: string;
  creditLimit?: string;
  closingDate?: string;
  dueDate?: string;
}

export function CreditCardForm({ card, cycles, onSuccess, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreditCardFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const openCycle = cycles?.find((c) => c.status === "open");

  const [name, setName] = useState(card?.name ?? "");
  const [lastFour, setLastFour] = useState(card?.last_four ?? "");
  const [creditLimit, setCreditLimit] = useState(
    card?.credit_limit_cents ? (card.credit_limit_cents / 100).toString() : ""
  );
  const [closingDate, setClosingDate] = useState<Date | undefined>(
    openCycle ? new Date(openCycle.closing_date + "T00:00:00") : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    openCycle ? new Date(openCycle.due_date + "T00:00:00") : undefined
  );
  const [currency, setCurrency] = useState<"ARS" | "USD">(card?.currency ?? "ARS");
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
      setCurrency(card.currency ?? "ARS");
    } else {
      setName("");
      setLastFour("");
      setCreditLimit("");
      setCurrency("ARS");
    }
    const oc = cycles?.find((c) => c.status === "open");
    if (oc) {
      setClosingDate(new Date(oc.closing_date + "T00:00:00"));
      setDueDate(new Date(oc.due_date + "T00:00:00"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClosingDateChange(date: Date | undefined) {
    if (!date) return;
    setClosingDate(date);
    const autoDue = nextDueDate(date);
    setDueDate(autoDue);
  }

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

    if (!closingDate) {
      newErrors.closingDate = "Closing date is required";
    }

    if (!dueDate) {
      newErrors.dueDate = "Due date is required";
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
      currency,
    };

    if (lastFour) {
      payload.last_four = lastFour;
    }

    if (creditLimit) {
      payload.credit_limit_cents = Math.round(parseFloat(creditLimit) * 100);
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

      // Update billing cycle if editing
      if (isEditing && openCycle && closingDate && dueDate) {
        const closingStr = closingDate.toISOString().split("T")[0];
        const dueStr = dueDate.toISOString().split("T")[0];
        const cycleResult = await updateCycle(openCycle.id, {
          closing_date: closingStr,
          due_date: dueStr,
        });
        if (cycleResult.error) {
          toast.error(`Card saved, but cycle update failed: ${cycleResult.error}`);
        }
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
                type="text"
                inputMode="numeric"
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
                type="text"
                inputMode="decimal"
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

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value as "ARS" | "USD")}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isEditing && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Next Closing Date</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        aria-invalid={!!errors.closingDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="font-mono">
                          {closingDate ? format(closingDate, "PPP") : "Pick a date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={closingDate}
                        onSelect={handleClosingDateChange}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.closingDate && (
                    <p className="text-xs text-rose-400">{errors.closingDate}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        aria-invalid={!!errors.dueDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="font-mono">
                          {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(d) => {
                          setDueDate(d);
                          if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.dueDate && (
                    <p className="text-xs text-rose-400">{errors.dueDate}</p>
                  )}
                  <p className="text-[10px] text-zinc-500">
                    Auto-calculated as 9 weekdays after closing
                  </p>
                </div>
              </div>
            )}
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
