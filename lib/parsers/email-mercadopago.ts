import { ParsedCharge } from "@/lib/types";
import { UserPaymentContext } from "@/lib/parsers/parse-text-charge";

export function parseMercadoPagoEmail(
  text: string,
  subject: string,
  ctx: UserPaymentContext
): ParsedCharge | null {
  const normalized = text.toLowerCase();

  // Check if this looks like a MercadoPago email
  const isMercadoPago =
    normalized.includes("mercado pago") ||
    normalized.includes("mercadopago") ||
    subject.toLowerCase().includes("mercado pago") ||
    subject.toLowerCase().includes("confirmación de pago");

  if (!isMercadoPago) return null;

  // Extract amount: $ 12.000,00 or $12000,00 or 12000.00
  const amountMatch =
    text.match(/\$\s*([\d.,]+)/) ||
    text.match(/total[\s:]*\$?\s*([\d.,]+)/i) ||
    text.match(/monto[\s:]*\$?\s*([\d.,]+)/i);

  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(/\./g, "").replace(",", ".");
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Extract merchant
  const merchantPatterns = [
    /en\s+([^\n\r]+?)(?:\.|\n|\r|$)/i,
    /comercio[\s:]*([^\n\r]+?)(?:\.|\n|\r|$)/i,
    /establecimiento[\s:]*([^\n\r]+?)(?:\.|\n|\r|$)/i,
    /vendedor[\s:]*([^\n\r]+?)(?:\.|\n|\r|$)/i,
  ];

  let description = "Mercado Pago";
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

  // Extract date
  const dateMatch =
    text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/) ||
    text.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);

  let date = new Date().toISOString().split("T")[0];
  if (dateMatch) {
    if (dateMatch[0].includes("/")) {
      // dd/mm/yyyy
      const [, day, month, year] = dateMatch;
      date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else {
      // yyyy-mm-dd
      const [, year, month, day] = dateMatch;
      date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  // Payment method: MercadoPago is typically a digital wallet/source
  const paymentSource = ctx.paymentSources.find((s) =>
    s.name.toLowerCase().includes("mercado pago")
  );

  // Budget category heuristic
  const category = ctx.budgetCategories.find((c) =>
    ["compras", "online", "mercado pago"].some((kw) =>
      c.name.toLowerCase().includes(kw)
    )
  );

  return {
    description,
    amount_cents: Math.round(amount * 100),
    currency: "ARS",
    date,
    payment_source_id: paymentSource?.id,
    budget_category_id: category?.id,
    is_installment: false,
  };
}
