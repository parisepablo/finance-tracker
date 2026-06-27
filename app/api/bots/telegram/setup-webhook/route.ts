import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (!botToken || !webhookSecret || !host) {
    return NextResponse.json(
      { error: "Missing configuration" },
      { status: 500 }
    );
  }

  // Telegram only allows A-Z, a-z, 0-9, '_' and '-' in the secret token.
  const validSecret = /^[A-Za-z0-9_-]+$/;
  if (!validSecret.test(webhookSecret)) {
    return NextResponse.json(
      {
        error:
          "TELEGRAM_WEBHOOK_SECRET contains invalid characters. Use only A-Z, a-z, 0-9, '_' and '-'. Base64 is not allowed.",
      },
      { status: 400 }
    );
  }

  const webhookUrl = `${protocol}://${host}/api/bots/telegram`;

  try {
    const url = new URL(`https://api.telegram.org/bot${botToken}/setWebhook`);
    url.searchParams.set("url", webhookUrl);
    url.searchParams.set("secret_token", webhookSecret);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        { error: data.description || "Failed to set webhook" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, webhook_url: webhookUrl });
  } catch (err) {
    console.error("setup-webhook error:", err);
    return NextResponse.json(
      { error: "Failed to set webhook" },
      { status: 500 }
    );
  }
}
