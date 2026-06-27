"use server";

import { createClient } from "@/lib/supabase/server";
import { UserSettings } from "@/lib/types";
import {
  getUserSettings,
  upsertUserSettings,
  unlinkTelegramChat as unlinkTelegramChatData,
  generateTelegramLinkCode as generateTelegramLinkCodeData,
} from "@/lib/data/user-settings";

export async function getCurrentUserSettings(): Promise<{
  data: UserSettings | null;
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

  const settings = await getUserSettings(supabase, user.id);
  return { data: settings, error: null };
}

export async function updateDefaultPaymentMethods(data: {
  defaultCreditCardId?: string | null;
  defaultPaymentSourceId?: string | null;
}): Promise<{ data: UserSettings | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  const settings = await upsertUserSettings(supabase, user.id, {
    default_credit_card_id: data.defaultCreditCardId ?? null,
    default_payment_source_id: data.defaultPaymentSourceId ?? null,
  });

  if (!settings) {
    return { data: null, error: "Failed to update settings" };
  }

  return { data: settings, error: null };
}

export async function updateDefaultBudgetCategory(
  budgetCategoryId: string | null
): Promise<{ data: UserSettings | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Unauthorized" };
  }

  const settings = await upsertUserSettings(supabase, user.id, {
    default_budget_category_id: budgetCategoryId,
  });

  if (!settings) {
    return { data: null, error: "Failed to update settings" };
  }

  return { data: settings, error: null };
}

export async function unlinkTelegramChatFromCurrentUser(): Promise<{
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

  const success = await unlinkTelegramChatData(supabase, user.id);
  return { success, error: success ? null : "Failed to unlink Telegram" };
}

export async function generateTelegramLinkCode(): Promise<{
  code: string | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { code: null, error: "Unauthorized" };
  }

  const code = await generateTelegramLinkCodeData(supabase, user.id);
  if (!code) {
    return { code: null, error: "Failed to generate link code" };
  }

  return { code, error: null };
}
