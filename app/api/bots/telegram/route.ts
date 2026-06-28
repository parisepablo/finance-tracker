import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  verifyTelegramWebhookSecret,
  sendTelegramMessage,
  answerCallbackQuery,
  editTelegramMessage,
  formatChargePreview,
  TelegramUpdate,
} from "@/lib/bots/telegram";
import { parseTextCharge, UserPaymentContext } from "@/lib/parsers/parse-text-charge";
import {
  getUserSettingsByTelegramChatId,
  getUserSettingsByTelegramLinkCode,
  upsertUserSettings,
} from "@/lib/data/user-settings";
import {
  createPendingCharge,
  findPotentialDuplicate,
  getPendingChargeByCallbackToken,
  getPendingChargeById,
  updatePendingChargeStatus,
} from "@/lib/data/pending-charges";
import { BudgetCategory, CreditCard, PaymentSource } from "@/lib/types";

async function getFinancialContext(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<UserPaymentContext> {
  const [cardsResult, sourcesResult, categoriesResult, settingsResult] = await Promise.all([
    supabase.from("credit_cards").select("*").eq("user_id", userId),
    supabase.from("payment_sources").select("*").eq("user_id", userId),
    supabase.from("budget_categories").select("*").eq("user_id", userId),
    supabase.from("user_settings").select("*").eq("user_id", userId).single(),
  ]);

  const cards = (cardsResult.data ?? []) as CreditCard[];
  const defaultCreditCardId = settingsResult.data?.default_credit_card_id;
  const defaultCard = defaultCreditCardId
    ? cards.find((c) => c.id === defaultCreditCardId)
    : null;

  return {
    cards,
    paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
    budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
    defaultCreditCardId,
    defaultPaymentSourceId: settingsResult.data?.default_payment_source_id,
    defaultBudgetCategoryId: settingsResult.data?.default_budget_category_id,
    defaultCurrency: defaultCard?.currency ?? "ARS",
  };
}

function getPaymentMethodName(
  ctx: UserPaymentContext,
  creditCardId?: string | null,
  paymentSourceId?: string | null
): string | undefined {
  if (creditCardId) {
    const card = ctx.cards.find((c) => c.id === creditCardId);
    if (card) {
      return card.last_four ? `${card.name} •••• ${card.last_four}` : card.name;
    }
  }
  if (paymentSourceId) {
    const source = ctx.paymentSources.find((s) => s.id === paymentSourceId);
    if (source) return source.name;
  }
  return undefined;
}

function getCategoryName(ctx: UserPaymentContext, categoryId?: string | null): string | undefined {
  if (!categoryId) return undefined;
  return ctx.budgetCategories.find((c) => c.id === categoryId)?.name;
}

async function handleStart(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
  text: string,
  username?: string
) {
  const args = text.split(" ").slice(1);
  const code = args[0]?.trim().toUpperCase();

  if (!code) {
    await sendTelegramMessage(
      chatId,
      "Hola. Para vincular tu cuenta, abrí la app, andá a Configuración > Telegram y copiá el código. Luego escribí `/start CODIGO`."
    );
    return;
  }

  const settings = await getUserSettingsByTelegramLinkCode(supabase, code);
  if (!settings) {
    await sendTelegramMessage(
      chatId,
      "El código es inválido o venció. Generá uno nuevo desde la app."
    );
    return;
  }

  await upsertUserSettings(supabase, settings.user_id, {
    telegram_chat_id: chatId.toString(),
    telegram_username: username ?? null,
    telegram_link_code: null,
    telegram_link_expires_at: null,
  });

  await sendTelegramMessage(
    chatId,
    "¡Listo! Ya podés enviarme tus gastos. Ejemplo: `12000 Carrefour visa 3 cuotas`",
    { parse_mode: "Markdown" }
  );
}

async function handleTextMessage(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
  text: string
) {
  const settings = await getUserSettingsByTelegramChatId(supabase, chatId.toString());
  if (!settings || !settings.telegram_chat_id) {
    console.error(`Telegram chat ${chatId} not linked to any user`);
    await sendTelegramMessage(
      chatId,
      "Tu cuenta no está vinculada. Escribí `/start CODIGO` con el código de la app.",
    );
    return;
  }

  const userId = settings.user_id;
  const ctx = await getFinancialContext(supabase, userId);

  // First, try to interpret as a follow-up amount for an incomplete pending charge
  const amountFollowUp = /^\s*[\d.,]+\s*$/.test(text);
  if (amountFollowUp) {
    const { data: incompleteCharges } = await supabase
      .from("pending_charges")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .is("amount_cents", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const incomplete = incompleteCharges?.[0];
    if (incomplete) {
      const normalized = text.replace(/\./g, "").replace(",", ".");
      const amount = Math.round(parseFloat(normalized) * 100);
      if (!isNaN(amount) && amount > 0) {
        await supabase
          .from("pending_charges")
          .update({ amount_cents: amount })
          .eq("id", incomplete.id);

        const updated = await getPendingChargeById(supabase, incomplete.id);
        if (updated) {
          await sendConfirmationMessage(supabase, chatId, updated, ctx);
        }
        return;
      }
    }
  }

  // Otherwise, parse as a new charge
  const result = parseTextCharge(text, ctx);

  if (result.status === "missing_amount") {
    const pending = await createPendingCharge(supabase, {
      userId,
      source: "telegram",
      rawInput: text,
      description: result.partial?.description,
      date: result.partial?.date,
      creditCardId: result.partial?.credit_card_id,
      paymentSourceId: result.partial?.payment_source_id,
      budgetCategoryId: result.partial?.budget_category_id,
      isInstallment: result.partial?.is_installment,
      totalInstallments: result.partial?.total_installments,
      status: "pending",
    });

    if (!pending) {
      await sendTelegramMessage(chatId, "Hubo un error guardando el gasto. Intentalo de nuevo.");
      return;
    }

    await sendTelegramMessage(chatId, "¿Cuánto fue?");
    return;
  }

  if (result.status === "low_confidence") {
    await sendTelegramMessage(
      chatId,
      "No entendí bien. ¿Podés repetir con monto, descripción y medio de pago?\nEjemplo: `5000 supermercado visa`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const charge = result.charge;

  // Duplicate check
  const duplicate = await findPotentialDuplicate(supabase, userId, charge);
  if (duplicate) {
    await sendTelegramMessage(
      chatId,
      "Parece que este gasto es similar a uno reciente. Si es distinto, envialo de nuevo con más detalle."
    );
    return;
  }

  const pending = await createPendingCharge(supabase, {
    userId,
    source: "telegram",
    rawInput: text,
    description: charge.description,
    amountCents: charge.amount_cents,
    currency: charge.currency,
    date: charge.date,
    creditCardId: charge.credit_card_id,
    paymentSourceId: charge.payment_source_id,
    budgetCategoryId: charge.budget_category_id,
    isInstallment: charge.is_installment,
    totalInstallments: charge.total_installments,
  });

  if (!pending) {
    await sendTelegramMessage(chatId, "Hubo un error guardando el gasto. Intentalo de nuevo.");
    return;
  }

  if (result.status === "unknown_payment_method") {
    await sendPaymentMethodSelection(supabase, chatId, pending, ctx);
    return;
  }

  await sendConfirmationMessage(supabase, chatId, pending, ctx);
}

async function sendConfirmationMessage(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
  pending: Awaited<ReturnType<typeof createPendingCharge>>,
  ctx: UserPaymentContext
) {
  if (!pending) return;

  const amountCents = pending.amount_cents ?? 0;
  const description = pending.description ?? "Gasto";
  const date = pending.date ?? new Date().toISOString().split("T")[0];

  const text =
    "¿Guardar este gasto?\n\n" +
    formatChargePreview({
      description,
      amountCents,
      currency: pending.currency ?? "ARS",
      date,
      paymentMethodName: getPaymentMethodName(
        ctx,
        pending.credit_card_id,
        pending.payment_source_id
      ),
      categoryName: getCategoryName(ctx, pending.budget_category_id),
      isInstallment: pending.is_installment,
      totalInstallments: pending.total_installments ?? undefined,
    });

  await sendTelegramMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Sí", callback_data: `c:${pending.callback_token}` },
          { text: "❌ No", callback_data: `d:${pending.callback_token}` },
        ],
        [
          { text: "💳 Cambiar medio", callback_data: `m:${pending.callback_token}` },
          { text: "🏷️ Categoría", callback_data: `g:${pending.callback_token}` },
        ],
      ],
    },
  });
}

async function sendPaymentMethodSelection(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
  pending: Awaited<ReturnType<typeof createPendingCharge>>,
  ctx: UserPaymentContext
) {
  if (!pending) return;

  const buttons: { text: string; callback_data: string }[] = [];

  for (const card of ctx.cards) {
    const label = card.last_four ? `${card.name} •••• ${card.last_four}` : card.name;
    buttons.push({
      text: label,
      callback_data: `cd:${card.id}:${pending.callback_token}`,
    });
  }

  for (const source of ctx.paymentSources) {
    buttons.push({
      text: source.name,
      callback_data: `so:${source.id}:${pending.callback_token}`,
    });
  }

  const amount = ((pending.amount_cents ?? 0) / 100).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });

  await sendTelegramMessage(
    chatId,
    `¿Con qué pagaste *${pending.description ?? "este gasto"}* de ${amount}?`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons.map((b) => [b]),
      },
    }
  );
}

async function handleCallback(
  supabase: ReturnType<typeof createServiceClient>,
  chatId: number,
  messageId: number,
  callbackQueryId: string,
  data: string
) {
  const parts = data.split(":");
  const action = parts[0];
  const token = parts.length === 2 ? parts[1] : parts[parts.length - 1];
  const idPart = parts.length === 3 ? parts[1] : undefined;

  const pending = token
    ? await getPendingChargeByCallbackToken(supabase, token)
    : null;
  if (!pending) {
    await answerCallbackQuery(callbackQueryId, {
      text: "Este gasto ya no está disponible.",
      show_alert: true,
    });
    return;
  }

  const ctx = await getFinancialContext(supabase, pending.user_id);

  if (action === "c") {
    const result = await confirmPendingCharge(supabase, pending);
    if (!result) {
      await answerCallbackQuery(callbackQueryId, {
        text: "Hubo un error guardando el gasto.",
        show_alert: true,
      });
      return;
    }

    await answerCallbackQuery(callbackQueryId, { text: "Guardado ✅" });
    await editTelegramMessage(chatId, messageId, "Gasto guardado ✅", {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "d") {
    await updatePendingChargeStatus(supabase, pending.id, "discarded");
    await answerCallbackQuery(callbackQueryId, { text: "Descartado" });
    await editTelegramMessage(chatId, messageId, "Gasto descartado", {
      reply_markup: { inline_keyboard: [] },
    });
    return;
  }

  if (action === "m") {
    await sendPaymentMethodSelection(supabase, chatId, pending, ctx);
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  if (action === "g") {
    const buttons = ctx.budgetCategories.map((cat) => ({
      text: cat.name,
      callback_data: `ca:${cat.id}:${pending.callback_token}`,
    }));

    await sendTelegramMessage(chatId, "¿A qué categoría va?", {
      reply_markup: { inline_keyboard: buttons.map((b) => [b]) },
    });
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  if (action === "cd") {
    const cardId = idPart;
    await supabase
      .from("pending_charges")
      .update({ credit_card_id: cardId, payment_source_id: null })
      .eq("id", pending.id);
    const updated = await getPendingChargeById(supabase, pending.id);
    if (updated) {
      await sendConfirmationMessage(supabase, chatId, updated, ctx);
    }
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  if (action === "so") {
    const sourceId = idPart;
    await supabase
      .from("pending_charges")
      .update({ payment_source_id: sourceId, credit_card_id: null })
      .eq("id", pending.id);
    const updated = await getPendingChargeById(supabase, pending.id);
    if (updated) {
      await sendConfirmationMessage(supabase, chatId, updated, ctx);
    }
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  if (action === "ca") {
    const categoryId = idPart;
    await supabase.from("pending_charges").update({ budget_category_id: categoryId }).eq("id", pending.id);
    const updated = await getPendingChargeById(supabase, pending.id);
    if (updated) {
      await sendConfirmationMessage(supabase, chatId, updated, ctx);
    }
    await answerCallbackQuery(callbackQueryId);
    return;
  }

  await answerCallbackQuery(callbackQueryId);
}

async function confirmPendingCharge(
  supabase: ReturnType<typeof createServiceClient>,
  pending: Awaited<ReturnType<typeof createPendingCharge>>
): Promise<boolean> {
  if (!pending || !pending.amount_cents || !pending.description || !pending.date) {
    return false;
  }

  const currency = pending.currency ?? "ARS";

  const totalInstallments = pending.is_installment && pending.total_installments
    ? pending.total_installments
    : 1;
  const installmentAmount = Math.round(pending.amount_cents / totalInstallments);
  const remainder = pending.amount_cents - installmentAmount * totalInstallments;
  const purchaseDate = new Date(pending.date);

  const rows = [];
  for (let i = 0; i < totalInstallments; i++) {
    const date = new Date(purchaseDate);
    date.setMonth(date.getMonth() + i);

    let amount = installmentAmount;
    if (i === 0) {
      amount += remainder;
    }

    rows.push({
      user_id: pending.user_id,
      description: pending.description,
      amount_cents: amount,
      currency,
      date: date.toISOString().split("T")[0],
      budget_category_id: pending.budget_category_id,
      credit_card_id: pending.credit_card_id,
      payment_source_id: pending.payment_source_id,
      fixed_expense_id: null,
      is_installment: totalInstallments > 1,
      total_installments: totalInstallments > 1 ? totalInstallments : null,
      current_installment: totalInstallments > 1 ? i + 1 : null,
    });
  }

  const { error: insertError } = await supabase.from("transactions").insert(rows);

  if (insertError) {
    console.error("confirmPendingCharge insert error:", insertError);
    return false;
  }

  await updatePendingChargeStatus(supabase, pending.id, "confirmed");
  return true;
}

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!verifyTelegramWebhookSecret(secretHeader)) {
    console.error("Telegram webhook rejected: invalid secret token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 200 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    console.error("Telegram webhook rejected: invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 200 });
  }

  console.log("Telegram webhook received:", {
    update_id: update.update_id,
    has_message: !!update.message,
    has_callback: !!update.callback_query,
    chat_id: update.message?.chat?.id ?? update.callback_query?.message?.chat?.id,
  });

  const supabase = createServiceClient();

  try {
    if (update.message?.text && update.message.chat) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      if (text.startsWith("/start")) {
        await handleStart(supabase, chatId, text, update.message.from?.username);
      } else {
        await handleTextMessage(supabase, chatId, text);
      }
    }

    if (update.callback_query?.message?.chat && update.callback_query.data) {
      const cb = update.callback_query;
      const message = cb.message;
      if (!message) return;
      await handleCallback(
        supabase,
        message.chat.id,
        message.message_id,
        cb.id,
        cb.data
      );
    }
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
