const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

function getApiUrl(method: string): string {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    reply_markup?: {
      inline_keyboard: InlineKeyboardButton[][];
    };
    parse_mode?: "Markdown" | "HTML";
  }
): Promise<void> {
  const url = getApiUrl("sendMessage");

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (options?.reply_markup) {
    body.reply_markup = options.reply_markup;
  }

  if (options?.parse_mode) {
    body.parse_mode = options.parse_mode;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("sendTelegramMessage failed:", res.status, errText);
      throw new Error(`Telegram API error: ${res.status}`);
    }
  } catch (err) {
    console.error("sendTelegramMessage error:", err);
    throw err;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  options?: { text?: string; show_alert?: boolean }
): Promise<void> {
  const url = getApiUrl("answerCallbackQuery");

  const body: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };

  if (options?.text) {
    body.text = options.text;
  }

  if (options?.show_alert) {
    body.show_alert = options.show_alert;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("answerCallbackQuery failed:", res.status, errText);
    }
  } catch (err) {
    console.error("answerCallbackQuery error:", err);
  }
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    reply_markup?: {
      inline_keyboard: InlineKeyboardButton[][];
    };
    parse_mode?: "Markdown" | "HTML";
  }
): Promise<void> {
  const url = getApiUrl("editMessageText");

  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
  };

  if (options?.reply_markup) {
    body.reply_markup = options.reply_markup;
  }

  if (options?.parse_mode) {
    body.parse_mode = options.parse_mode;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("editTelegramMessage failed:", res.status, errText);
      throw new Error(`Telegram API error: ${res.status}`);
    }
  } catch (err) {
    console.error("editTelegramMessage error:", err);
    throw err;
  }
}

export function verifyTelegramWebhookSecret(headerSecret: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not configured");
    return false;
  }
  return headerSecret === expected;
}

export function formatChargePreview(options: {
  description: string;
  amountCents: number;
  date: string;
  paymentMethodName?: string;
  categoryName?: string;
  isInstallment: boolean;
  totalInstallments?: number;
}): string {
  const amount = (options.amountCents / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });

  const date = new Date(options.date).toLocaleDateString("es-AR");

  let text = `*${options.description}* — ${amount} el ${date}`;

  if (options.paymentMethodName) {
    text += `\n💳 ${options.paymentMethodName}`;
  }

  if (options.categoryName) {
    text += `\n🏷️ ${options.categoryName}`;
  }

  if (options.isInstallment && options.totalInstallments) {
    const installmentAmount = options.amountCents / options.totalInstallments / 100;
    text += `\n📅 ${options.totalInstallments} cuotas de ${installmentAmount.toLocaleString(
      "es-AR",
      { style: "currency", currency: "ARS" }
    )}`;
  }

  return text;
}
