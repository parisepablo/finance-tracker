import { SupabaseClient } from "@supabase/supabase-js";
import {
  PendingCharge,
  PendingChargeSource,
  PendingChargeStatus,
  ParsedCharge,
} from "@/lib/types";

export interface CreatePendingChargeInput {
  userId: string;
  source: PendingChargeSource;
  sourceRef?: string;
  rawInput?: string;
  description?: string;
  amountCents?: number;
  date?: string;
  creditCardId?: string;
  paymentSourceId?: string;
  budgetCategoryId?: string;
  isInstallment?: boolean;
  totalInstallments?: number;
  status?: PendingChargeStatus;
  parseError?: string;
}

export async function createPendingCharge(
  supabase: SupabaseClient,
  input: CreatePendingChargeInput
): Promise<PendingCharge | null> {
  const { data, error } = await supabase
    .from("pending_charges")
    .insert({
      user_id: input.userId,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      raw_input: input.rawInput ?? null,
      description: input.description ?? null,
      amount_cents: input.amountCents ?? null,
      date: input.date ?? null,
      credit_card_id: input.creditCardId ?? null,
      payment_source_id: input.paymentSourceId ?? null,
      budget_category_id: input.budgetCategoryId ?? null,
      is_installment: input.isInstallment ?? false,
      total_installments: input.totalInstallments ?? null,
      status: input.status ?? "pending",
      parse_error: input.parseError ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("createPendingCharge error:", error);
    return null;
  }

  return data as PendingCharge;
}

export async function getPendingChargeByToken(
  supabase: SupabaseClient,
  token: string
): Promise<PendingCharge | null> {
  const { data, error } = await supabase
    .from("pending_charges")
    .select("*")
    .eq("confirmation_token", token)
    .single();

  if (error || !data) return null;
  return data as PendingCharge;
}

export async function getPendingChargeById(
  supabase: SupabaseClient,
  id: string
): Promise<PendingCharge | null> {
  const { data, error } = await supabase
    .from("pending_charges")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PendingCharge;
}

export async function listPendingCharges(
  supabase: SupabaseClient,
  userId: string,
  statuses?: PendingChargeStatus[]
): Promise<PendingCharge[]> {
  let query = supabase
    .from("pending_charges")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (statuses && statuses.length > 0) {
    query = query.in("status", statuses);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("listPendingCharges error:", error);
    return [];
  }

  return data as PendingCharge[];
}

export async function findPotentialDuplicate(
  supabase: SupabaseClient,
  userId: string,
  charge: ParsedCharge,
  windowMinutes = 10
): Promise<PendingCharge | null> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("pending_charges")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "confirmed"])
    .gte("created_at", since)
    .or(
      `credit_card_id.eq.${charge.credit_card_id ?? "null"},payment_source_id.eq.${charge.payment_source_id ?? "null"}`
    );

  if (error || !data || data.length === 0) return null;

  const amountTolerance = Math.round(charge.amount_cents * 0.01);

  const duplicate = (data as PendingCharge[]).find((p) => {
    if (!p.amount_cents) return false;
    const amountMatch =
      Math.abs(p.amount_cents - charge.amount_cents) <= amountTolerance;
    const descriptionMatch =
      !charge.description ||
      !p.description ||
      p.description
        .toLowerCase()
        .includes(charge.description.toLowerCase().split(" ")[0]) ||
      charge.description
        .toLowerCase()
        .includes(p.description.toLowerCase().split(" ")[0]);
    return amountMatch && descriptionMatch;
  });

  return duplicate ?? null;
}

export async function updatePendingChargeStatus(
  supabase: SupabaseClient,
  id: string,
  status: PendingChargeStatus
): Promise<boolean> {
  const updates: Record<string, unknown> = { status };
  if (status === "confirmed" || status === "discarded") {
    updates.confirmed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("pending_charges")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("updatePendingChargeStatus error:", error);
    return false;
  }

  return true;
}

export async function cleanupOldPendingCharges(
  supabase: SupabaseClient,
  retentionDays: number
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { error, count } = await supabase
    .from("pending_charges")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso)
    .in("status", ["confirmed", "discarded", "parse_failed", "notification_failed"]);

  if (error) {
    console.error("cleanupOldPendingCharges error:", error);
    return 0;
  }

  return count ?? 0;
}

export async function scrubOldRawInput(
  supabase: SupabaseClient,
  retentionDays: number
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const { error, count } = await supabase
    .from("pending_charges")
    .update({ raw_input: null })
    .lt("created_at", cutoffIso)
    .not("raw_input", "is", null);

  if (error) {
    console.error("scrubOldRawInput error:", error);
    return 0;
  }

  return count ?? 0;
}
