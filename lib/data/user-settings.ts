import { SupabaseClient } from "@supabase/supabase-js";
import { UserSettings } from "@/lib/types";

export async function getUserSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as UserSettings;
}

export async function getUserSettingsByTelegramChatId(
  supabase: SupabaseClient,
  chatId: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .single();

  if (error || !data) return null;
  return data as UserSettings;
}

export async function upsertUserSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: Partial<Omit<UserSettings, "user_id" | "created_at" | "updated_at">>
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error || !data) {
    console.error("upsertUserSettings error:", error);
    return null;
  }

  return data as UserSettings;
}

export async function linkTelegramChat(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  username?: string
): Promise<UserSettings | null> {
  return upsertUserSettings(supabase, userId, {
    telegram_chat_id: chatId,
    telegram_username: username ?? null,
  });
}

export async function unlinkTelegramChat(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_settings")
    .update({
      telegram_chat_id: null,
      telegram_username: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    console.error("unlinkTelegramChat error:", error);
    return false;
  }

  return true;
}

export async function generateTelegramLinkCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        telegram_link_code: code,
        telegram_link_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("generateTelegramLinkCode error:", error);
    return null;
  }

  return code;
}

export async function getUserSettingsByTelegramLinkCode(
  supabase: SupabaseClient,
  code: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("telegram_link_code", code)
    .single();

  if (error || !data) return null;

  const settings = data as UserSettings;
  if (
    !settings.telegram_link_expires_at ||
    new Date(settings.telegram_link_expires_at) < new Date()
  ) {
    return null;
  }

  return settings;
}

export async function getUserSettingsByEmailAlias(
  supabase: SupabaseClient,
  alias: string
): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("email_alias", alias)
    .single();

  if (error || !data) return null;
  return data as UserSettings;
}
