export interface VoiceChargeResult {
  description?: string;
  totalAmount?: string;
  date?: string;
  budgetCategoryId?: string;
  isInstallment?: boolean;
  totalInstallments?: string;
}

export async function parseVoiceCharge(
  transcript: string,
  categories: { id: string; name: string }[]
): Promise<Partial<VoiceChargeResult>> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return {};
  }

  const categoryNames = categories.map((c) => c.name).join(", ");
  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are parsing a spoken expense description into structured data.

Transcript: "${transcript}"

Available budget categories (exact names): ${categoryNames}

Respond ONLY with a raw JSON object. No markdown, no explanation, no code blocks.
Use these exact keys:
- amount: number (just the numeric amount, no currency symbols, no commas as thousand separators)
- description: string (a concise description of the expense)
- category: string (must exactly match one of the provided category names, or omit if uncertain)
- date: string (ISO date YYYY-MM-DD. Use ${today} if not mentioned. If the user says "yesterday", use yesterday's date. If they say "last week", use the date from 7 days ago.)
- installments: number (default 1 if not mentioned)

Return ONLY the JSON object. Example:
{"amount": 15000, "description": "Supermercado", "category": "Comida", "date": "2024-01-15", "installments": 1}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Gemini API error:", res.status, errText);
      return {};
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) {
      return {};
    }

    let jsonText = text;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/```(?:json)?\s*/, "")
        .replace(/```\s*$/, "");
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const result: Partial<VoiceChargeResult> = {};

    if (
      typeof parsed.description === "string" &&
      parsed.description.trim()
    ) {
      result.description = parsed.description.trim();
    }

    if (typeof parsed.amount === "number" && parsed.amount > 0) {
      result.totalAmount = parsed.amount.toString();
    }

    if (
      typeof parsed.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
    ) {
      result.date = parsed.date;
    }

    const category = parsed.category;
    if (typeof category === "string" && category.trim()) {
      const matched = categories.find(
        (c) =>
          c.name.toLowerCase() === category.toLowerCase().trim()
      );
      if (matched) {
        result.budgetCategoryId = matched.id;
      }
    }

    const installments =
      typeof parsed.installments === "number"
        ? parsed.installments
        : 1;
    if (installments > 1) {
      result.isInstallment = true;
      result.totalInstallments = installments.toString();
    }

    return result;
  } catch {
    return {};
  }
}
