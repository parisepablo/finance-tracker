"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getCurrentUserSettings,
  generateTelegramLinkCode,
  unlinkTelegramChatFromCurrentUser,
  updateDefaultPaymentMethods,
  updateDefaultBudgetCategory,
} from "@/lib/actions/user-settings";
import { getPaymentSources } from "@/lib/actions/payment-sources";
import { UserSettings, CreditCard, BudgetCategory, PaymentSource } from "@/lib/types";

function formatEmailAlias(alias: string | null | undefined): string {
  if (!alias) return "";
  const domain = process.env.NEXT_PUBLIC_CHARGE_EMAIL_DOMAIN || "yourdomain.com";
  return `charges+${alias}@${domain}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: settingsData, error: settingsError }, sourceResult, cardRes, budgetRes] =
      await Promise.all([
        getCurrentUserSettings(),
        getPaymentSources(),
        fetch("/api/cards"),
        fetch("/api/budgets"),
      ]);

    if (settingsError) {
      toast.error(settingsError);
    }
    setSettings(settingsData);

    if (sourceResult.data) {
      setPaymentSources(sourceResult.data);
    }

    if (cardRes.ok) {
      const cardData = await cardRes.json();
      setCards((cardData.data ?? []) as CreditCard[]);
    }

    if (budgetRes.ok) {
      const budgetData = await budgetRes.json();
      setBudgetCategories((budgetData.data ?? []) as BudgetCategory[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleGenerateCode() {
    setGenerating(true);
    const { code, error } = await generateTelegramLinkCode();
    if (error || !code) {
      toast.error(error ?? "Failed to generate code");
      setGenerating(false);
      return;
    }

    await fetchData();
    toast.success("Code generated. Send it to the bot with /start CODE.");
    setGenerating(false);
  }

  async function handleUnlink() {
    setUnlinking(true);
    const { success, error } = await unlinkTelegramChatFromCurrentUser();
    if (!success) {
      toast.error(error ?? "Failed to unlink");
      setUnlinking(false);
      return;
    }

    await fetchData();
    toast.success("Telegram unlinked");
    setUnlinking(false);
  }

  async function handleDefaultPaymentMethodChange(value: string) {
    setSavingDefaults(true);
    const [type, id] = value.split(":");
    const payload =
      type === "card"
        ? { defaultCreditCardId: id || null, defaultPaymentSourceId: null }
        : { defaultCreditCardId: null, defaultPaymentSourceId: id || null };

    const { error } = await updateDefaultPaymentMethods(payload);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Default payment method updated");
      await fetchData();
    }
    setSavingDefaults(false);
  }

  async function handleDefaultCategoryChange(value: string) {
    setSavingDefaults(true);
    const { error } = await updateDefaultBudgetCategory(value === "none" ? null : value);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Default category updated");
      await fetchData();
    }
    setSavingDefaults(false);
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const isLinked = !!settings?.telegram_chat_id;

  const defaultPaymentValue = settings?.default_credit_card_id
    ? `card:${settings.default_credit_card_id}`
    : settings?.default_payment_source_id
      ? `source:${settings.default_payment_source_id}`
      : "none";

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card className="border-[#18122B] bg-[#0f0c19]">
        <CardHeader>
          <CardTitle className="text-white">Telegram Bot</CardTitle>
          <CardDescription className="text-zinc-400">
            Send charges to the bot and confirm them without opening the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLinked ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Telegram linked {settings.telegram_username && `(@${settings.telegram_username})`}
              </div>
              <div className="rounded-lg border border-[#18122B] bg-[#18122B]/50 px-4 py-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Email forwarding address</p>
                <p className="text-sm font-mono text-white break-all">
                  {formatEmailAlias(settings.email_alias)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Forward MercadoPago and Visa/BNA receipts to this address.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleUnlink}
                disabled={unlinking}
              >
                {unlinking ? "Unlinking..." : "Unlink Telegram"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                1. Open Telegram and start the bot. <br />
                2. Send <code>/start CODE</code> using the code below.
              </p>

              {settings?.telegram_link_code ? (
                <div className="rounded-lg border border-[#18122B] bg-[#18122B]/50 px-4 py-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Your code</p>
                  <p className="text-2xl font-mono font-semibold text-white tracking-widest">
                    {settings.telegram_link_code}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Expires in 10 minutes
                  </p>
                </div>
              ) : null}

              <Button
                onClick={handleGenerateCode}
                disabled={generating}
                className="w-full md:w-auto"
              >
                {generating ? "Generating..." : settings?.telegram_link_code ? "Regenerate code" : "Generate code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#18122B] bg-[#0f0c19]">
        <CardHeader>
          <CardTitle className="text-white">Quick-add defaults</CardTitle>
          <CardDescription className="text-zinc-400">
            Pre-fill the quick-add form with your most common choices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="default-payment">Default payment method</Label>
            <Select
              value={defaultPaymentValue}
              onValueChange={handleDefaultPaymentMethodChange}
              disabled={savingDefaults}
            >
              <SelectTrigger id="default-payment">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={`card:${card.id}`}>
                    {card.name} {card.last_four && `•••• ${card.last_four}`}
                  </SelectItem>
                ))}
                {paymentSources.map((source) => (
                  <SelectItem key={source.id} value={`source:${source.id}`}>
                    {source.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="default-category">Default budget category</Label>
            <Select
              value={settings?.default_budget_category_id || "none"}
              onValueChange={handleDefaultCategoryChange}
              disabled={savingDefaults}
            >
              <SelectTrigger id="default-category">
                <SelectValue placeholder="None" />
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
        </CardContent>
      </Card>
    </div>
  );
}
