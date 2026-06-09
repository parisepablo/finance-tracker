"use server";

import { createClient } from "@/lib/supabase/server";
import { PaymentSource } from "@/lib/types";

export async function getPaymentSources(): Promise<{
  data: PaymentSource[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("payment_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function createPaymentSource(data: {
  name: string;
  type: "digital" | "cash";
  color: string;
}): Promise<{
  data: PaymentSource | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    return { data: null, error: "Name is required" };
  }

  if (!data.type || (data.type !== "digital" && data.type !== "cash")) {
    return { data: null, error: "Type must be digital or cash" };
  }

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!data.color || typeof data.color !== "string" || !hexRegex.test(data.color)) {
    return { data: null, error: "Color must be a valid hex code" };
  }

  const { data: result, error } = await supabase
    .from("payment_sources")
    .insert({
      user_id: user.id,
      name: data.name.trim(),
      type: data.type,
      color: data.color,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: result as PaymentSource, error: null };
}

export async function updatePaymentSource(
  id: string,
  data: Partial<{
    name: string;
    type: "digital" | "cash";
    color: string;
  }>
): Promise<{
  data: PaymentSource | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim() === "") {
      return { data: null, error: "Name is required" };
    }
    updates.name = data.name.trim();
  }

  if (data.type !== undefined) {
    if (data.type !== "digital" && data.type !== "cash") {
      return { data: null, error: "Type must be digital or cash" };
    }
    updates.type = data.type;
  }

  if (data.color !== undefined) {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (typeof data.color !== "string" || !hexRegex.test(data.color)) {
      return { data: null, error: "Color must be a valid hex code" };
    }
    updates.color = data.color;
  }

  if (Object.keys(updates).length === 0) {
    return { data: null, error: "No fields to update" };
  }

  const { data: result, error } = await supabase
    .from("payment_sources")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: result as PaymentSource, error: null };
}

export async function deletePaymentSource(
  id: string
): Promise<{
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
    .from("payment_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
