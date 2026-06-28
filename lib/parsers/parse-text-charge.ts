import { ParsedCharge, BudgetCategory, CreditCard, PaymentSource } from "@/lib/types";

export interface UserPaymentContext {
  cards: CreditCard[];
  paymentSources: PaymentSource[];
  budgetCategories: BudgetCategory[];
  defaultCreditCardId?: string | null;
  defaultPaymentSourceId?: string | null;
  defaultBudgetCategoryId?: string | null;
}

export type ParseTextResult =
  | { status: "success"; charge: ParsedCharge }
  | { status: "missing_amount"; partial: Partial<ParsedCharge> }
  | { status: "low_confidence"; partial?: Partial<ParsedCharge> }
  | { status: "unknown_payment_method"; charge: ParsedCharge };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDate(text: string): string | null {
  const normalized = normalize(text);
  const today = new Date();

  if (normalized.includes("anteayer")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d.toISOString().split("T")[0];
  }

  if (normalized.includes("ayer")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }

  if (normalized.includes("la semana pasada")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }

  if (normalized.includes("hoy")) {
    return today.toISOString().split("T")[0];
  }

  // Try ISO date YYYY-MM-DD
  const isoMatch = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Try Spanish date DD/MM/YYYY or DD-MM-YYYY
  const esMatch = text.match(/(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?/);
  if (esMatch) {
    const day = esMatch[1].padStart(2, "0");
    const month = esMatch[2].padStart(2, "0");
    const yearRaw = esMatch[3];
    const year = yearRaw ? (yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : today.getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseAmount(text: string): number | null {
  // Match numbers like 12000, 12.000, 12.000,50, 12000,50
  // Use \d+ first so "12000" is not split into "12".
  const matches = text.match(/(\d+(?:[.,]\d{3})*)(?:[.,](\d{2}))?/g);
  if (!matches) return null;

  // Prefer the largest number that looks like an amount (not a date or small number)
  let bestAmount: number | null = null;
  for (const match of matches) {
    // Skip if it looks like a date
    if (/\d{1,2}[/-]\d{1,2}/.test(match)) continue;

    const normalized = match.replace(/\./g, "").replace(",", ".");
    const amount = parseFloat(normalized);
    if (!isNaN(amount) && amount > 0) {
      if (bestAmount === null || amount > bestAmount) {
        bestAmount = amount;
      }
    }
  }

  if (bestAmount === null) return null;
  return Math.round(bestAmount * 100);
}

function parseInstallments(text: string): { isInstallment: boolean; totalInstallments?: number } {
  const normalized = normalize(text);

  // Match "3 cuotas", "en 6 cuotas", "3 pagos", etc.
  const match = normalized.match(/(?:en\s+)?(\d+)\s*(?:cuotas|pagos|veces)/);
  if (match) {
    const count = parseInt(match[1], 10);
    if (count > 1) {
      return { isInstallment: true, totalInstallments: count };
    }
  }

  return { isInstallment: false };
}

function findPaymentMethod(
  text: string,
  ctx: UserPaymentContext
): { creditCardId?: string; paymentSourceId?: string; methodName?: string } | null {
  const normalized = normalize(text);

  // Direct card name/last four matches
  for (const card of ctx.cards) {
    const cardNameNorm = normalize(card.name);
    if (normalized.includes(cardNameNorm)) {
      return { creditCardId: card.id, methodName: card.name };
    }
    if (card.last_four && normalized.includes(card.last_four)) {
      return { creditCardId: card.id, methodName: `${card.name} •••• ${card.last_four}` };
    }
  }

  // Direct payment source name matches
  for (const source of ctx.paymentSources) {
    const sourceNameNorm = normalize(source.name);
    if (normalized.includes(sourceNameNorm)) {
      return { paymentSourceId: source.id, methodName: source.name };
    }
  }

  // Keyword mappings (Spanish + English synonyms)
  const keywordMappings: { keywords: string[]; creditCardName?: string; sourceType?: PaymentSource["type"]; sourceKeywords?: string[] }[] = [
    { keywords: ["visa", "mastercard", "master", "amex", "american express"], creditCardName: "visa" },
    { keywords: ["transferencia", "transfer", "transf", "debito", "debit"], sourceType: "digital", sourceKeywords: ["transferencia", "transfer", "debito", "debit"] },
    { keywords: ["efectivo", "cash"], sourceType: "cash", sourceKeywords: ["efectivo", "cash"] },
    { keywords: ["mercado pago", "mercadopago", "mp"], sourceType: "digital", sourceKeywords: ["mercado pago", "mercadopago", "mp"] },
    { keywords: ["uala"], sourceType: "digital", sourceKeywords: ["uala"] },
    { keywords: ["modo"], sourceType: "digital", sourceKeywords: ["modo"] },
  ];

  for (const mapping of keywordMappings) {
    const matched = mapping.keywords.some((kw) => normalized.includes(kw));
    if (!matched) continue;

    if (mapping.creditCardName) {
      // Find a card matching the keyword name
      const card = ctx.cards.find((c) => normalize(c.name).includes(mapping.creditCardName as string));
      if (card) {
        return { creditCardId: card.id, methodName: card.name };
      }
    }

    if (mapping.sourceType && mapping.sourceKeywords) {
      const source = ctx.paymentSources.find(
        (s) =>
          s.type === mapping.sourceType &&
          mapping.sourceKeywords?.some((kw) => normalize(s.name).includes(kw))
      );
      if (source) {
        return { paymentSourceId: source.id, methodName: source.name };
      }
    }
  }

  return null;
}

function findBudgetCategory(
  text: string,
  ctx: UserPaymentContext
): { id: string; name: string } | null {
  const normalized = normalize(text);

  for (const cat of ctx.budgetCategories) {
    const catNameNorm = normalize(cat.name);
    if (normalized.includes(catNameNorm)) {
      return { id: cat.id, name: cat.name };
    }
  }

  // Merchant-to-category heuristic mappings
  const merchantMappings: { keywords: string[]; categoryName: string }[] = [
    { keywords: ["supermercado", "carrefour", "coto", "dia", "vea", "jumbo", "walmart", "disco"], categoryName: "supermercado" },
    { keywords: ["restaurante", "comida", "pedidos ya", "rappi", "uber eats", "mcdonalds", "burger king"], categoryName: "comida" },
    { keywords: ["nafta", "combustible", "ypf", "shell", "axion"], categoryName: "transporte" },
    { keywords: ["uber", "cabify", "taxi", "remis", "subte", "colectivo"], categoryName: "transporte" },
    { keywords: ["farmacia", "medicamentos", "receta"], categoryName: "salud" },
    { keywords: ["netflix", "spotify", "youtube", "streaming"], categoryName: "entretenimiento" },
    { keywords: ["mercadolibre", "compra online", "envio"], categoryName: "compras" },
    { keywords: ["almacen", "kiosco"], categoryName: "comida" },
  ];

  for (const mapping of merchantMappings) {
    const matched = mapping.keywords.some((kw) => normalized.includes(kw));
    if (matched) {
      const cat = ctx.budgetCategories.find((c) => normalize(c.name).includes(mapping.categoryName));
      if (cat) {
        return { id: cat.id, name: cat.name };
      }
    }
  }

  return null;
}

function buildDescription(
  text: string,
  amountCents: number,
  paymentMethodName?: string,
  categoryName?: string
): string {
  let desc = text;

  // Remove amount(s)
  const amountNum = amountCents / 100;
  desc = desc.replace(new RegExp(`\\b${amountNum.toLocaleString("es-AR")}\\b`, "gi"), " ");
  desc = desc.replace(new RegExp(`\\b${amountNum}\\b`, "g"), " ");

  // Remove installment phrases
  desc = desc.replace(/\ben?\s+\d+\s*(?:cuotas|pagos|veces)\b/gi, " ");

  // Remove date words
  desc = desc.replace(/\b(hoy|ayer|anteayer|la semana pasada)\b/gi, " ");

  // Remove ISO/Spanish dates
  desc = desc.replace(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/g, " ");
  desc = desc.replace(/\d{1,2}[-/]\d{1,2}(?:[-/]\d{2,4})?/g, " ");

  // Remove payment method name
  if (paymentMethodName) {
    const parts = paymentMethodName.split("••••")[0].trim();
    desc = desc.replace(new RegExp(`\\b${normalize(parts)}\\b`, "gi"), " ");
  }

  // Remove category name
  if (categoryName) {
    desc = desc.replace(new RegExp(`\\b${normalize(categoryName)}\\b`, "gi"), " ");
  }

  // Clean up
  desc = desc
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  return desc || "Gasto";
}

export function parseTextCharge(
  text: string,
  ctx: UserPaymentContext
): ParseTextResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { status: "low_confidence" };
  }

  const amountCents = parseAmount(trimmed);
  if (!amountCents) {
    return { status: "missing_amount", partial: {} };
  }

  const date = parseDate(trimmed) || new Date().toISOString().split("T")[0];
  const { isInstallment, totalInstallments } = parseInstallments(trimmed);

  const paymentMethod = findPaymentMethod(trimmed, ctx);
  const category = findBudgetCategory(trimmed, ctx);

  const description = buildDescription(
    trimmed,
    amountCents,
    paymentMethod?.methodName,
    category?.name
  );

  const charge: ParsedCharge = {
    description,
    amount_cents: amountCents,
    date,
    credit_card_id: paymentMethod?.creditCardId,
    payment_source_id: paymentMethod?.paymentSourceId,
    budget_category_id: category?.id,
    is_installment: isInstallment,
    total_installments: totalInstallments,
  };

  // If no payment method found, ask the user
  if (!paymentMethod) {
    return { status: "unknown_payment_method", charge };
  }

  return { status: "success", charge };
}
