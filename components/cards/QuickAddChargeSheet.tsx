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
import { CalendarIcon, CreditCard as CreditCardIcon, Smartphone, Banknote, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreditCard, BudgetCategory, PaymentSource } from "@/lib/types";
import { haptics } from "@/lib/haptics";

type PaymentMethod =
  | { type: "card"; id: string; name: string; lastFour?: string; color?: string }
  | { type: "source"; id: string; name: string; sourceType: "digital" | "cash"; color: string };

interface QuickAddChargeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCard[];
  paymentSources: PaymentSource[];
  budgetCategories: BudgetCategory[];
  onSuccess: () => void;
}

interface FormErrors {
  description?: string;
  totalAmount?: string;
  date?: string;
  totalInstallments?: string;
}

export function QuickAddChargeSheet({
  open,
  onOpenChange,
  cards,
  paymentSources,
  budgetCategories,
  onSuccess,
}: QuickAddChargeSheetProps) {
  const [step, setStep] = useState<"picker" | "form">("picker");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

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
    if (!open) {
      setStep("picker");
      setSelectedMethod(null);
      return;
    }
    setLoading(false);
    setErrors({});
    setDescription("");
    setTotalAmount("");
    setDate(new Date());
    setIsInstallment(false);
    setTotalInstallments("");
    setBudgetCategoryId("");

    // Auto-skip picker if only one payment method exists
    const allMethods: PaymentMethod[] = [
      ...cards.map((c) => ({
        type: "card" as const,
        id: c.id,
        name: c.name,
        lastFour: c.last_four,
        color: undefined,
      })),
      ...paymentSources.map((s) => ({
        type: "source" as const,
        id: s.id,
        name: s.name,
        sourceType: s.type,
        color: s.color,
      })),
    ];

    if (allMethods.length === 1) {
      setSelectedMethod(allMethods[0]);
      setStep("form");
    } else {
      setStep("picker");
      setSelectedMethod(null);
    }
  }, [open, cards, paymentSources]);

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
    if (!validate() || !selectedMethod) return;

    setLoading(true);

    const amountNum = parseFloat(totalAmount);
    const payload: Record<string, unknown> = {
      description: description.trim(),
      total_amount_cents: Math.round(amountNum * 100),
      date: date!.toISOString().split("T")[0],
      is_installment: selectedMethod.type === "card" ? isInstallment : false,
      total_installments:
        selectedMethod.type === "card" && isInstallment
          ? parseInt(totalInstallments, 10)
          : undefined,
      budget_category_id: budgetCategoryId || undefined,
    };

    if (selectedMethod.type === "source") {
      payload.payment_source_id = selectedMethod.id;
    }

    // For the URL we need a card ID. Use the selected card if it's a card charge,
    // otherwise use a dummy UUID since the backend ignores it when payment_source_id is present.
    const urlCardId =
      selectedMethod.type === "card"
        ? selectedMethod.id
        : cards[0]?.id ?? "00000000-0000-0000-0000-000000000000";

    try {
      const res = await fetch(`/api/cards/${urlCardId}/charges`, {
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
      haptics.success();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  }

  const side = isMobile ? "bottom" : "right";

  const isSource = selectedMethod?.type === "source";

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
        {step === "picker" && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle>How did you pay?</SheetTitle>
              <SheetDescription>
                Select the payment method for this charge.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3 py-4">
              {cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedMethod({
                      type: "card",
                      id: card.id,
                      name: card.name,
                      lastFour: card.last_four,
                    });
                    setStep("form");
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:bg-zinc-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600/20 to-violet-600/20">
                    <CreditCardIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{card.name}</p>
                    {card.last_four && (
                      <p className="text-xs text-zinc-500 font-mono">
                        •••• {card.last_four}
                      </p>
                    )}
                  </div>
                </button>
              ))}

              {paymentSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => {
                    setSelectedMethod({
                      type: "source",
                      id: source.id,
                      name: source.name,
                      sourceType: source.type,
                      color: source.color,
                    });
                    setStep("form");
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:bg-zinc-800"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${source.color}22, ${source.color}11)`,
                    }}
                  >
                    {source.type === "cash" ? (
                      <Banknote className="h-5 w-5" style={{ color: source.color }} />
                    ) : (
                      <Smartphone className="h-5 w-5" style={{ color: source.color }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{source.name}</p>
                    <p className="text-xs text-zinc-500">
                      {source.type === "digital" ? "Digital wallet" : "Cash"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === "form" && selectedMethod && (
          <>
            <SheetHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setStep("picker");
                    setSelectedMethod(null);
                  }}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <SheetTitle>New charge</SheetTitle>
                  <SheetDescription>
                    {selectedMethod.type === "card"
                      ? `Adding to ${selectedMethod.name}${selectedMethod.lastFour ? ` •••• ${selectedMethod.lastFour}` : ""}`
                      : `Adding to ${selectedMethod.name}`}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-3 py-4">
              {isSource && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300">
                  Payment source: <span className="font-medium text-white">{selectedMethod.name}</span>
                </div>
              )}

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
                  type="text"
                  inputMode="decimal"
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

              {!isSource && (
                <>
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
                        type="text"
                        inputMode="numeric"
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
                </>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
