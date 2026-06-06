import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type IncomeSource, type FixedExpense } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(cents: number, currency = "ARS"): string {
  const locale = currency === "USD" ? "en-US" : "es-AR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100)
}

export function getMonthlyEquivalent(
  amount_cents: number,
  billing_cycle: string
): number {
  switch (billing_cycle) {
    case "monthly":
      return amount_cents
    case "quarterly":
      return Math.round(amount_cents / 3)
    case "annual":
      return Math.round(amount_cents / 12)
    default:
      return amount_cents
  }
}

export function sumIncomeSources(sources: IncomeSource[]): number {
  return sources
    .filter((source) => source.is_active)
    .reduce((sum, source) => sum + source.amount_cents, 0)
}

export function sumFixedExpenses(expenses: FixedExpense[]): number {
  return expenses
    .filter((expense) => expense.is_active)
    .reduce(
      (sum, expense) =>
        sum + getMonthlyEquivalent(expense.amount_cents, expense.billing_cycle),
      0
    )
}

export function getDiscretionaryPool(income: number, fixed: number): number {
  return Math.max(0, income - fixed)
}
