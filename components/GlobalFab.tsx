"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Fab } from "@/components/ui/fab";
import { QuickAddChargeSheet } from "@/components/cards/QuickAddChargeSheet";
import { CreditCard, BudgetCategory } from "@/lib/types";

export function GlobalFab() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;

    async function fetchData() {
      try {
        const res = await fetch("/api/cards");
        if (!res.ok) return;
        const cardData = await res.json();
        setCards(cardData.data ?? []);

        const catRes = await fetch("/api/budgets");
        if (!catRes.ok) return;
        const catData = await catRes.json();
        setBudgetCategories((catData.data ?? []) as BudgetCategory[]);
      } catch {
        // Silently fail — FAB won't show if no cards
      } finally {
        setLoaded(true);
      }
    }

    fetchData();
  }, [isLoginPage]);

  if (isLoginPage) return null;
  if (!loaded) return null;
  if (cards.length === 0) return null;

  return (
    <>
      <Fab onClick={() => setSheetOpen(true)} />
      <QuickAddChargeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cards={cards}
        budgetCategories={budgetCategories}
        onSuccess={() => {
          // Trigger a soft refresh if possible, otherwise just close
          window.location.reload();
        }}
      />
    </>
  );
}
