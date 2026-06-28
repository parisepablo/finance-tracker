import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeInboundEmail, extractEmailAlias, stripHtml } from "@/lib/bots/email";
import { getUserSettingsByEmailAlias } from "@/lib/data/user-settings";
import { parseMercadoPagoEmail } from "@/lib/parsers/email-mercadopago";
import { parseVisaBnaEmail } from "@/lib/parsers/email-visa-bna";
import { parseChargeWithLLM } from "@/lib/parsers/llm-fallback";
import { extractTextFromPdf } from "@/lib/parsers/pdf-text";
import {
  createPendingCharge,
  findPotentialDuplicate,
} from "@/lib/data/pending-charges";
import { sendTelegramMessage, formatChargePreview } from "@/lib/bots/telegram";
import { BudgetCategory, CreditCard, PaymentSource, ParsedCharge } from "@/lib/types";

function verifyEmailWebhookSecret(request: NextRequest): boolean {
  const expected = process.env.RESEND_WEBHOOK_SECRET;
  if (!expected) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return false;
  }
  const provided = request.nextUrl.searchParams.get("secret");
  return provided === expected;
}

async function getFinancialContext(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const [cardsResult, sourcesResult, categoriesResult, settingsResult] = await Promise.all([
    supabase.from("credit_cards").select("*").eq("user_id", userId),
    supabase.from("payment_sources").select("*").eq("user_id", userId),
    supabase.from("budget_categories").select("*").eq("user_id", userId),
    supabase.from("user_settings").select("*").eq("user_id", userId).single(),
  ]);

  return {
    cards: (cardsResult.data ?? []) as CreditCard[],
    paymentSources: (sourcesResult.data ?? []) as PaymentSource[],
    budgetCategories: (categoriesResult.data ?? []) as BudgetCategory[],
    defaultCreditCardId: settingsResult.data?.default_credit_card_id,
    defaultPaymentSourceId: settingsResult.data?.default_payment_source_id,
    defaultBudgetCategoryId: settingsResult.data?.default_budget_category_id,
  };
}

function getPaymentMethodName(
  ctx: Awaited<ReturnType<typeof getFinancialContext>>,
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

function getCategoryName(
  ctx: Awaited<ReturnType<typeof getFinancialContext>>,
  categoryId?: string | null
): string | undefined {
  if (!categoryId) return undefined;
  return ctx.budgetCategories.find((c) => c.id === categoryId)?.name;
}

export async function POST(request: NextRequest) {
  if (!verifyEmailWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeInboundEmail(payload);
  if (!email) {
    return NextResponse.json({ error: "Invalid email payload" }, { status: 400 });
  }

  const domain = process.env.CHARGE_EMAIL_DOMAIN;
  if (!domain) {
    console.error("CHARGE_EMAIL_DOMAIN is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const alias = extractEmailAlias(email.to);
  if (!alias) {
    return NextResponse.json({ error: "No alias found" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const settings = await getUserSettingsByEmailAlias(supabase, alias);
  if (!settings) {
    return NextResponse.json({ error: "User not found" }, { status: 200 });
  }

  const userId = settings.user_id;
  const ctx = await getFinancialContext(supabase, userId);

  const bodyText = email.text || stripHtml(email.html || "");
  const combinedText = `${email.subject}\n\n${bodyText}`;

  // Try parsers in order
  let parsed: ParsedCharge | null = parseMercadoPagoEmail(bodyText, email.subject, ctx);
  if (!parsed) {
    parsed = parseVisaBnaEmail(bodyText, email.subject, ctx);
  }

  // If body parsers fail, try PDF attachments (e.g. Carrefour ticket)
  if (!parsed && email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      if (attachment.contentType.toLowerCase().includes("pdf")) {
        const pdfText = await extractTextFromPdf(attachment.content);
        if (pdfText) {
          parsed = parseMercadoPagoEmail(pdfText, email.subject, ctx);
          if (!parsed) {
            parsed = parseVisaBnaEmail(pdfText, email.subject, ctx);
          }
          if (!parsed) {
            parsed = await parseChargeWithLLM(
              `${email.subject}\n\n${pdfText}`,
              ctx
            );
          }
          if (parsed) break;
        }
      }
    }
  }

  if (!parsed) {
    parsed = await parseChargeWithLLM(combinedText, ctx);
  }

  if (!parsed) {
    await createPendingCharge(supabase, {
      userId,
      source: "email",
      sourceRef: email.subject,
      rawInput: combinedText.slice(0, 4000),
      status: "parse_failed",
      parseError: "No parser could extract charge data",
    });

    if (settings.telegram_chat_id) {
      await sendTelegramMessage(
        parseInt(settings.telegram_chat_id, 10),
        `Recibí un email de *${email.from}* pero no pude leer los datos. ¿Querés cargarlo manualmente?\nAsunto: ${email.subject}`,
        { parse_mode: "Markdown" }
      );
    }

    return NextResponse.json({ ok: true, parsed: false });
  }

  const duplicate = await findPotentialDuplicate(supabase, userId, parsed);
  if (duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const pending = await createPendingCharge(supabase, {
    userId,
    source: "email",
    sourceRef: email.subject,
    rawInput: combinedText.slice(0, 4000),
    description: parsed.description,
    amountCents: parsed.amount_cents,
    date: parsed.date,
    creditCardId: parsed.credit_card_id,
    paymentSourceId: parsed.payment_source_id,
    budgetCategoryId: parsed.budget_category_id,
    isInstallment: parsed.is_installment,
    totalInstallments: parsed.total_installments,
  });

  if (!pending) {
    return NextResponse.json(
      { error: "Failed to create pending charge" },
      { status: 500 }
    );
  }

  if (!settings.telegram_chat_id) {
    await createPendingCharge(supabase, {
      userId,
      source: "email",
      sourceRef: email.subject,
      rawInput: combinedText.slice(0, 4000),
      description: parsed.description,
      amountCents: parsed.amount_cents,
      date: parsed.date,
      creditCardId: parsed.credit_card_id,
      paymentSourceId: parsed.payment_source_id,
      budgetCategoryId: parsed.budget_category_id,
      isInstallment: parsed.is_installment,
      totalInstallments: parsed.total_installments,
      status: "notification_failed",
      parseError: "No Telegram chat linked",
    });

    return NextResponse.json({ ok: true, notified: false });
  }

  const text =
    "Detecté un gasto por email. ¿Guardarlo?\n\n" +
    formatChargePreview({
      description: parsed.description,
      amountCents: parsed.amount_cents,
      date: parsed.date,
      paymentMethodName: getPaymentMethodName(
        ctx,
        parsed.credit_card_id,
        parsed.payment_source_id
      ),
      categoryName: getCategoryName(ctx, parsed.budget_category_id),
      isInstallment: parsed.is_installment,
      totalInstallments: parsed.total_installments,
    });

  await sendTelegramMessage(parseInt(settings.telegram_chat_id, 10), text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Sí", callback_data: `c:${pending.callback_token}` },
          { text: "❌ No", callback_data: `d:${pending.callback_token}` },
        ],
      ],
    },
  });

  return NextResponse.json({ ok: true, notified: true });
}
