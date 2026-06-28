import { ParsedCharge } from "@/lib/types";
import { UserPaymentContext } from "@/lib/parsers/parse-text-charge";

export function parseVisaBnaEmail(
  text: string,
  subject: string,
  ctx: UserPaymentContext
): ParsedCharge | null {
  const normalizedSubject = subject.toLowerCase();
  const normalizedText = text.toLowerCase();

  const isVisaBna =
    normalizedSubject.includes("compra aprobada") ||
    normalizedSubject.includes("transacción aprobada") ||
    normalizedSubject.includes("visa") ||
    normalizedSubject.includes("bna") ||
    normalizedText.includes("banco nación") ||
    normalizedText.includes("visa bna");

  if (!isVisaBna) return null;

  // Extract amount
  const amountMatch =
    text.match(/monto[\s:]*\$?\s*([\d.,]+)/i) ||
    text.match(/importe[\s:]*\$?\s*([\d.,]+)/i) ||
    text.match(/\$\s*([\d.,]+)/);

  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Extract merchant
  const merchantPatterns = [
    /comercio[\s:]*([^\n\r]+?)(?:\.|\n|\r|$)/i,
    /establecimiento[\s:]*([^\n\r]+?)(?:\.|\n|\r|$)/i,
    /en\s+([^\n\r]+?)(?:\.|\n|\r|$)/i,
  ];

  let description = "Compra con tarjeta";
  for (const pattern of merchantPatterns) {
    const match = text.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      if (candidate.length > 2 && candidate.length < 80) {
        description = candidate;
        break;
      }
    }
  }

  // Extract last 4 digits to identify card
  const lastFourMatch = text.match(/(?:\*|[Xx]|\.\.\.\.\s*)(\d{4})/);
  const lastFour = lastFourMatch ? lastFourMatch[1] : null;

  let creditCard = lastFour
    ? ctx.cards.find((c) => c.last_four === lastFour)
    : null;

  // Fallback: match by card name keywords like "visa" or "mastercard"
  if (!creditCard) {
    const cardKeywords = ["visa", "mastercard", "master", "amex"];
    for (const kw of cardKeywords) {
      if (normalizedText.includes(kw)) {
        const found = ctx.cards.find((c) =>
          c.name.toLowerCase().includes(kw === "master" ? "mastercard" : kw)
        );
        if (found) {
          creditCard = found;
          break;
        }
      }
    }
  }

  // Extract date
  const dateMatch =
    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/) ||
    text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);

  let date = new Date().toISOString().split("T")[0];
  if (dateMatch) {
    const firstSlash = dateMatch[0].indexOf("/");
    const sep = firstSlash !== -1 ? "/" : "-";
    const parts = dateMatch[0].split(sep);
    if (parts[0].length === 4) {
      date = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      date = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  // Budget category heuristic
  const category = ctx.budgetCategories.find((c) =>
    ["compras", "tarjeta"].some((kw) => c.name.toLowerCase().includes(kw))
  );

  return {
    description,
    amount_cents: Math.round(amount * 100),
    currency: "ARS",
    date,
    credit_card_id: creditCard?.id,
    budget_category_id: category?.id,
    is_installment: false,
  };
}
