import { ParsedCharge, BudgetCategory, CreditCard, PaymentSource } from "@/lib/types";

export async function parseChargeWithLLM(
  text: string,
  options: {
    cards: CreditCard[];
    paymentSources: PaymentSource[];
    budgetCategories: BudgetCategory[];
  }
): Promise<ParsedCharge | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const today = new Date().toISOString().split("T")[0];

  const cardNames = options.cards
    .map((c) => `${c.name}${c.last_four ? ` •••• ${c.last_four}` : ""}`)
    .join("; ");

  const sourceNames = options.paymentSources.map((s) => s.name).join("; ");
  const categoryNames = options.budgetCategories.map((c) => c.name).join("; ");

  const prompt = `You are parsing a payment receipt email or message into structured data.

Text: """${text}"""

Available credit cards: ${cardNames || "none"}
Available payment sources (wallets/cash): ${sourceNames || "none"}
Available budget categories: ${categoryNames || "none"}

Respond ONLY with a raw JSON object. No markdown, no explanation, no code blocks.
Use these exact keys:
- amount: number (numeric amount, no currency symbols)
- description: string (concise merchant or concept)
- date: string (ISO date YYYY-MM-DD. Use ${today} if not mentioned.)
- credit_card_name: string (exact name of a credit card from the list, or omit)
- payment_source_name: string (exact name of a payment source from the list, or omit)
- category_name: string (exact budget category name from the list, or omit)
- installments: number (default 1 if not mentioned)

Return ONLY the JSON object.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Gemini fallback API error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const responseText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!responseText) return null;

    let jsonText = responseText;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/```(?:json)?\s*/, "")
        .replace(/```\s*$/, "");
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    if (typeof parsed.amount !== "number" || parsed.amount <= 0) {
      return null;
    }

    const result: ParsedCharge = {
      description:
        typeof parsed.description === "string"
          ? parsed.description.trim()
          : "Gasto",
      amount_cents: Math.round(parsed.amount * 100),
      date:
        typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
          ? parsed.date
          : today,
      is_installment: false,
    };

    if (typeof parsed.credit_card_name === "string") {
      const name = parsed.credit_card_name.toLowerCase().trim();
      const card = options.cards.find((c) => c.name.toLowerCase() === name);
      if (card) result.credit_card_id = card.id;
    }

    if (typeof parsed.payment_source_name === "string") {
      const name = parsed.payment_source_name.toLowerCase().trim();
      const source = options.paymentSources.find((s) => s.name.toLowerCase() === name);
      if (source) result.payment_source_id = source.id;
    }

    if (typeof parsed.category_name === "string") {
      const name = parsed.category_name.toLowerCase().trim();
      const category = options.budgetCategories.find((c) => c.name.toLowerCase() === name);
      if (category) result.budget_category_id = category.id;
    }

    const installments =
      typeof parsed.installments === "number" ? parsed.installments : 1;
    if (installments > 1) {
      result.is_installment = true;
      result.total_installments = installments;
    }

    return result;
  } catch (err) {
    console.error("LLM fallback parse error:", err);
    return null;
  }
}
