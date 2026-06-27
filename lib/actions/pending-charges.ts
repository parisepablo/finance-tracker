"use server";

import { createClient } from "@/lib/supabase/server";
import { PendingCharge, PendingChargeStatus } from "@/lib/types";
import { listPendingCharges } from "@/lib/data/pending-charges";

export async function getCurrentUserPendingCharges(statuses?: PendingChargeStatus[]): Promise<{
  data: PendingCharge[];
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: [], error: "Unauthorized" };
  }

  const charges = await listPendingCharges(supabase, user.id, statuses);
  return { data: charges, error: null };
}

export async function discardPendingCharge(id: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("pending_charges")
    .update({ status: "discarded", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
