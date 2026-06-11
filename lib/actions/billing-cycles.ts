"use server";

import { createClient } from "@/lib/supabase/server";
import { BillingCycle } from "@/lib/types";
import { nextClosingDate, nextDueDate } from "@/lib/billing-cycles";

export async function getOpenCycle(creditCardId: string): Promise<BillingCycle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("credit_card_id", creditCardId)
    .eq("status", "open")
    .single();

  if (error || !data) return null;
  return data as BillingCycle;
}

export async function getClosedCycles(creditCardId: string): Promise<BillingCycle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("credit_card_id", creditCardId)
    .eq("status", "closed")
    .order("closing_date", { ascending: false });

  if (error || !data) return [];
  return data as BillingCycle[];
}

export async function getAllCycles(creditCardId: string): Promise<BillingCycle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("credit_card_id", creditCardId)
    .order("closing_date", { ascending: false });

  if (error || !data) return [];
  return data as BillingCycle[];
}

export async function updateCycle(
  id: string,
  data: { opening_date?: string; closing_date?: string; due_date?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const updates: Record<string, string> = {};
  if (data.opening_date) updates.opening_date = data.opening_date;
  if (data.closing_date) updates.closing_date = data.closing_date;
  if (data.due_date) updates.due_date = data.due_date;

  if (Object.keys(updates).length === 0) {
    return { error: "No fields to update" };
  }

  const { error } = await supabase
    .from("billing_cycles")
    .update(updates)
    .eq("id", id)
    .eq("status", "open");

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function createCycle(
  creditCardId: string,
  openingDate: string,
  closingDate: string,
  dueDate: string,
  status: "open" | "closed" = "open"
): Promise<{ data: BillingCycle | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("billing_cycles")
    .insert({
      credit_card_id: creditCardId,
      opening_date: openingDate,
      closing_date: closingDate,
      due_date: dueDate,
      status,
    })
    .select()
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Failed to create cycle" };
  }

  return { data: data as BillingCycle, error: null };
}

export async function autoAdvanceCycles(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Get all open cycles that are past their closing date
  const { data: overdueCycles, error } = await supabase
    .from("billing_cycles")
    .select("*, credit_cards(user_id)")
    .eq("status", "open")
    .lt("closing_date", new Date().toISOString().split("T")[0])
    .eq("credit_cards.user_id", user.id);

  if (error || !overdueCycles || overdueCycles.length === 0) return;

  for (const cycle of overdueCycles) {
    // Close the current cycle
    await supabase
      .from("billing_cycles")
      .update({ status: "closed" })
      .eq("id", cycle.id);

    // Check if a new open cycle already exists
    const { data: existingOpen } = await supabase
      .from("billing_cycles")
      .select("id")
      .eq("credit_card_id", cycle.credit_card_id)
      .eq("status", "open")
      .single();

    if (existingOpen) continue;

    // Create new open cycle
    const lastClosing = new Date(cycle.closing_date);
    const newOpening = new Date(lastClosing);
    newOpening.setDate(newOpening.getDate() + 1);
    const newClosing = nextClosingDate(lastClosing);
    const newDue = nextDueDate(newClosing);

    await supabase
      .from("billing_cycles")
      .insert({
        credit_card_id: cycle.credit_card_id,
        opening_date: newOpening.toISOString().split("T")[0],
        closing_date: newClosing.toISOString().split("T")[0],
        due_date: newDue.toISOString().split("T")[0],
        status: "open",
      });
  }
}
