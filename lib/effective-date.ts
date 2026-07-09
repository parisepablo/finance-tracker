import { IncomeSource, FixedExpense } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function getEffectiveIncomeForMonth(
  allVersions: IncomeSource[],
  month: string
): IncomeSource[] {
  const bySeries = new Map<string, IncomeSource[]>();
  for (const version of allVersions) {
    const list = bySeries.get(version.series_id) ?? [];
    list.push(version);
    bySeries.set(version.series_id, list);
  }

  const result: IncomeSource[] = [];
  for (const [, versions] of bySeries) {
    const applicable = versions
      .filter((v) => v.effective_from_month <= month)
      .sort((a, b) => a.effective_from_month.localeCompare(b.effective_from_month));
    const latest = applicable[applicable.length - 1];
    if (latest && !latest.is_deleted) {
      result.push(latest);
    }
  }

  return result;
}

export function getEffectiveFixedExpensesForMonth(
  allVersions: FixedExpense[],
  month: string
): FixedExpense[] {
  const bySeries = new Map<string, FixedExpense[]>();
  for (const version of allVersions) {
    const list = bySeries.get(version.series_id) ?? [];
    list.push(version);
    bySeries.set(version.series_id, list);
  }

  const result: FixedExpense[] = [];
  for (const [, versions] of bySeries) {
    const applicable = versions
      .filter((v) => v.effective_from_month <= month)
      .sort((a, b) => a.effective_from_month.localeCompare(b.effective_from_month));
    const latest = applicable[applicable.length - 1];
    if (latest && !latest.is_deleted) {
      result.push(latest);
    }
  }

  return result;
}

export async function getEffectiveIncomeSources(
  supabase: SupabaseClient,
  userId: string,
  month: string
): Promise<IncomeSource[]> {
  const { data, error } = await supabase.rpc("get_effective_income_sources", {
    p_user_id: userId,
    p_month: month,
  });

  if (error) {
    console.error("getEffectiveIncomeSources error:", error);
    return [];
  }

  return (data ?? []) as IncomeSource[];
}

export async function getEffectiveFixedExpenses(
  supabase: SupabaseClient,
  userId: string,
  month: string
): Promise<FixedExpense[]> {
  const { data, error } = await supabase.rpc("get_effective_fixed_expenses", {
    p_user_id: userId,
    p_month: month,
  });

  if (error) {
    console.error("getEffectiveFixedExpenses error:", error);
    return [];
  }

  return (data ?? []) as FixedExpense[];
}
