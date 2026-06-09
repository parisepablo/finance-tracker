"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Fab } from "@/components/ui/fab";
import { QuickAddChargeSheet } from "@/components/cards/QuickAddChargeSheet";
import { CreditCard, BudgetCategory, PaymentSource } from "@/lib/types";
import { getPaymentSources } from "@/lib/actions/payment-sources";

export function GlobalFab() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;

    async function fetchData() {
      try {
        const [cardRes, catRes, sourceResult] = await Promise.all([
          fetch("/api/cards"),
          fetch("/api/budgets"),
          getPaymentSources(),
        ]);

        if (cardRes.ok) {
          const cardData = await cardRes.json();
          setCards(cardData.data ?? []);
        }

        if (catRes.ok) {
          const catData = await catRes.json();
          setBudgetCategories((catData.data ?? []) as BudgetCategory[]);
        }

        if (sourceResult.data) {
          setPaymentSources(sourceResult.data);
        }
      } catch {
        // Silently fail — FAB won't show if no payment methods
      } finally {
        setLoaded(true);
      }
    }

    fetchData();
  }, [isLoginPage]);

  if (isLoginPage) return null;
  if (!loaded) return null;
  if (cards.length === 0 && paymentSources.length === 0) return null;

  return (
    <>
      <Fab onClick={() => setSheetOpen(true)} />
      <QuickAddChargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cards={cards}
        paymentSources={paymentSources}
        budgetCategories={budgetCategories}
        onSuccess={() => {
          // Trigger a soft refresh if possible, otherwise just close
          window.location.reload();
        }}
      />
    </>
  );
}
