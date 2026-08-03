"use client";

import { useState, useEffect, useRef } from "react";
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
import { CreditCard, BudgetCategory, PaymentSource, UserSettings } from "@/lib/types";
import { haptics } from "@/lib/haptics";
import { VoiceMicButton } from "@/components/VoiceMicButton";
import { getCurrentUserSettings } from "@/lib/actions/user-settings";

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

interface StoredChargePrefs {
  budgetCategoryId?: string;
  currency?: "ARS" | "USD";
  frequent: { description: string; budgetCategoryId?: string }[];
}

const PREFS_KEY = "cinco-last-charge-prefs";

function loadChargePrefs(): StoredChargePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as StoredChargePrefs) : null;
  } catch {
    return null;
  }
}

function saveChargePrefs(prefs: StoredChargePrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function addFrequentCharge(
  current: StoredChargePrefs | null,
  description: string,
  budgetCategoryId?: string
): StoredChargePrefs {
  const base = current ?? { frequent: [] };
  const normalized = description.trim();
  if (!normalized) return base;

  const withoutDup = base.frequent.filter(
    (f) => f.description.toLowerCase() !== normalized.toLowerCase()
  );
  const next = [{ description: normalized, budgetCategoryId }, ...withoutDup].slice(0, 8);

  return {
    ...base,
    frequent: next,
  };
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
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dateOpen, setDateOpen] = useState(false);
  const [frequentCharges, setFrequentCharges] = useState<{ description: string; budgetCategoryId?: string }[]>([]);

  const [isMobile, setIsMobile] = useState(false);

  const cardsRef = useRef(cards);
  const paymentSourcesRef = useRef(paymentSources);
  cardsRef.current = cards;
  paymentSourcesRef.current = paymentSources;

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
    setCurrency("ARS");
    setDateOpen(false);

    const allMethods: PaymentMethod[] = [
      ...cardsRef.current.map((c) => ({
        type: "card" as const,
        id: c.id,
        name: c.name,
        lastFour: c.last_four,
        color: undefined,
      })),
      ...paymentSourcesRef.current.map((s) => ({
        type: "source" as const,
        id: s.id,
        name: s.name,
        sourceType: s.type,
        color: s.color,
      })),
    ];

    async function applyDefaults() {
      const { data: settings } = await getCurrentUserSettings();
      const stored = loadChargePrefs();
      setFrequentCharges(stored?.frequent ?? []);

      const defaultCategoryId = settings?.default_budget_category_id;

      // Apply last-used currency
      if (stored?.currency) {
        setCurrency(stored.currency);
      }

      // Prefer settings default category, fallback to last-used
      const categoryId = defaultCategoryId ?? stored?.budgetCategoryId;
      if (categoryId) {
        setBudgetCategoryId(categoryId);
      }

      // Only auto-select when there is a single payment method; otherwise let the
      // user pick manually so the default/last-used method does not redirect them.
      if (allMethods.length === 1) {
        setSelectedMethod(allMethods[0]);
        setStep("form");
        return;
      }

      setStep("picker");
      setSelectedMethod(null);
    }

    applyDefaults();
    // Only reset/initialize when the sheet opens/closes; cards and paymentSources
    // are accessed via refs so parent re-fetches don't snap the user back to the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      currency,
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

      // Remember preferences for next time
      const currentPrefs = loadChargePrefs();
      const nextPrefs = addFrequentCharge(
        currentPrefs,
        payload.description as string,
        budgetCategoryId || undefined
      );
      nextPrefs.currency = currency;
      nextPrefs.budgetCategoryId = budgetCategoryId || undefined;
      saveChargePrefs(nextPrefs);

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
          "flex flex-col overflow-hidden bg-[#0f0c19]",
          isMobile
            ? "h-[92vh] max-h-[92vh] rounded-t-2xl border-t border-[#18122B]"
            : "w-full max-w-sm border-l border-[#18122B]"
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

            <div className="flex-1 overflow-y-auto space-y-4 py-5 md:space-y-3 md:py-4">
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
                  className="w-full flex items-center gap-3 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4 text-left transition-colors hover:bg-[#18122B]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600/20 to-violet-600/20 md:h-10 md:w-10">
                    <CreditCardIcon className="h-6 w-6 text-emerald-400 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-zinc-200 md:text-sm">{card.name}</p>
                    {card.last_four && (
                      <p className="text-sm text-zinc-500 font-mono md:text-xs">
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
                  className="w-full flex items-center gap-3 rounded-xl border border-[#18122B] bg-[#0f0c19] p-4 text-left transition-colors hover:bg-[#18122B]"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg md:h-10 md:w-10"
                    style={{
                      background: `linear-gradient(135deg, ${source.color}22, ${source.color}11)`,
                    }}
                  >
                    {source.type === "cash" ? (
                      <Banknote className="h-6 w-6 md:h-5 md:w-5" style={{ color: source.color }} />
                    ) : (
                      <Smartphone className="h-6 w-6 md:h-5 md:w-5" style={{ color: source.color }} />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-medium text-zinc-200 md:text-sm">{source.name}</p>
                    <p className="text-sm text-zinc-500 md:text-xs">
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
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-[#18122B]"
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

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 px-4 py-5 md:space-y-4 md:px-3 md:py-4">
              {isSource && (
                <div className="rounded-lg border border-[#18122B] bg-[#18122B]/50 px-3 py-2 text-base text-zinc-300 md:text-sm">
                  Payment source: <span className="font-medium text-white">{selectedMethod.name}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quick-desc" className="text-base md:text-sm">Description</Label>
                  <VoiceMicButton
                    categories={budgetCategories.map((c) => ({ id: c.id, name: c.name }))}
                    budgetCategories={budgetCategories}
                    cards={cards}
                    paymentSources={paymentSources}
                    defaultBudgetCategoryId={budgetCategoryId}
                    defaultCurrency={currency}
                    className="h-10 w-10 md:h-9 md:w-9"
                    onParsed={(result) => {
                      if (result.description) setDescription(result.description);
                      if (result.totalAmount) setTotalAmount(result.totalAmount);
                      if (result.date) setDate(new Date(result.date));
                      if (result.budgetCategoryId) setBudgetCategoryId(result.budgetCategoryId);
                      if (result.isInstallment) {
                        setIsInstallment(true);
                        if (result.totalInstallments) setTotalInstallments(result.totalInstallments);
                      }
                    }}
                  />
                </div>
                <Input
                  id="quick-desc"
                  autoFocus
                  placeholder="e.g. Groceries, Netflix"
                  value={description}
                  className="h-12 text-base md:h-9 md:text-sm"
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                  }}
                  aria-invalid={!!errors.description}
                />
                {errors.description && (
                  <p className="text-xs text-rose-400">{errors.description}</p>
                )}
                {frequentCharges.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {frequentCharges.map((charge) => (
                      <button
                        key={charge.description}
                        type="button"
                        onClick={() => {
                          setDescription(charge.description);
                          if (charge.budgetCategoryId) {
                            setBudgetCategoryId(charge.budgetCategoryId);
                          }
                          if (errors.description) setErrors((p) => ({ ...p, description: undefined }));
                        }}
                        className="inline-flex items-center rounded-full border border-[#18122B] bg-[#18122B]/60 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-[#18122B] hover:text-white"
                      >
                        {charge.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-amount" className="text-base md:text-sm">Amount</Label>
                  <Input
                    id="quick-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={totalAmount}
                    className="h-12 text-base md:h-9 md:text-sm font-mono no-spinner"
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
                  <Label htmlFor="quick-currency" className="text-base md:text-sm">Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(value) => setCurrency(value as "ARS" | "USD")}
                  >
                    <SelectTrigger id="quick-currency" className="h-12 text-base md:h-9 md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS" className="h-12 text-base md:h-9 md:text-sm">ARS</SelectItem>
                      <SelectItem value="USD" className="h-12 text-base md:h-9 md:text-sm">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-base md:text-sm">Date</Label>
                <Popover modal={false} open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start text-left text-base font-normal md:h-9 md:text-sm"
                      aria-invalid={!!errors.date}
                    >
                      <CalendarIcon className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                      <span className="font-mono">{date ? format(date, "PPP") : "Pick a date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-0 md:w-auto">
                    <Calendar
                      mode="single"
                      selected={date}
                      className="[--cell-size:2.75rem] text-base md:[--cell-size:2rem] md:text-sm"
                      onSelect={(d) => {
                        setDate(d);
                        if (d) setDateOpen(false);
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
                <Label htmlFor="quick-budget" className="text-base md:text-sm">Budget Category</Label>
                <Select
                  value={budgetCategoryId || "none"}
                  onValueChange={(value) =>
                    setBudgetCategoryId(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger id="quick-budget" className="h-12 w-full text-base md:h-9 md:text-sm">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80 bg-[#18122B] border-[#2a2345]">
                    <SelectItem value="none" className="h-12 text-base hover:bg-[#231c3d] focus:bg-[#231c3d] md:h-9 md:text-sm">None</SelectItem>
                    {[...budgetCategories]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="h-12 text-base hover:bg-[#231c3d] focus:bg-[#231c3d] md:h-9 md:text-sm">
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
                    <Label htmlFor="quick-installment" className="cursor-pointer text-base md:text-sm">
                      Installment purchase
                    </Label>
                  </div>

                  {isInstallment && (
                    <div className="space-y-1.5">
                      <Label htmlFor="quick-installments" className="text-base md:text-sm">Installments</Label>
                      <Input
                        id="quick-installments"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 6"
                        value={totalInstallments}
                        className="h-12 text-base md:h-9 md:text-sm font-mono"
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
                  className="h-12 w-full text-base md:h-9 md:text-sm"
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
