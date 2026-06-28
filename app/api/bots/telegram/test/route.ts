import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/bots/telegram";
import { getUserSettings } from "@/lib/data/user-settings";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getUserSettings(supabase, user.id);
  if (!settings || !settings.telegram_chat_id) {
    return NextResponse.json(
      { error: "Telegram not linked. Send /start CODE to the bot first." },
      { status: 400 }
    );
  }

  try {
    await sendTelegramMessage(
      parseInt(settings.telegram_chat_id, 10),
      "🔧 Test message from Cinco al Peso. If you see this, the bot can reach you."
    );
    return NextResponse.json({ ok: true, chat_id: settings.telegram_chat_id });
  } catch (err) {
    console.error("Telegram test error:", err);
    return NextResponse.json(
      { error: "Failed to send test message", details: String(err) },
      { status: 500 }
    );
  }
}
