import { parseTextCharge, UserPaymentContext } from "@/lib/parsers/parse-text-charge";
import type { ParsedCharge } from "@/lib/types";

export interface VoiceChargeResult {
  description?: string;
  totalAmount?: string;
  date?: string;
  budgetCategoryId?: string;
  isInstallment?: boolean;
  totalInstallments?: string;
}

export type VoiceParseError =
  | "missing_key"
  | "api_error"
  | "no_transcript"
  | "parse_error"
  | "no_data";

export interface ParseVoiceChargeResult {
  result: Partial<VoiceChargeResult>;
  error?: VoiceParseError;
  errorMessage?: string;
}

function mapTextChargeResult(
  parsed: ReturnType<typeof parseTextCharge>,
  categories: { id: string; name: string }[]
): Partial<VoiceChargeResult> {
  if (parsed.status === "low_confidence") return {};

  const charge: Partial<ParsedCharge> =
    parsed.status === "missing_amount" ? parsed.partial ?? {} : parsed.charge;

  const result: Partial<VoiceChargeResult> = {};

  if (charge.description) {
    result.description = charge.description;
  }

  if (charge.amount_cents && charge.amount_cents > 0) {
    result.totalAmount = (charge.amount_cents / 100).toString();
  }

  if (charge.date) {
    result.date = charge.date;
  }

  if (charge.budget_category_id) {
    const matched = categories.find((c) => c.id === charge.budget_category_id);
    if (matched) {
      result.budgetCategoryId = matched.id;
    }
  }

  if (charge.is_installment && charge.total_installments && charge.total_installments > 1) {
    result.isInstallment = true;
    result.totalInstallments = charge.total_installments.toString();
  }

  return result;
}

export async function parseVoiceCharge(
  transcript: string,
  categories: { id: string; name: string }[],
  ctx?: UserPaymentContext
): Promise<ParseVoiceChargeResult> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!transcript?.trim()) {
    return { result: {}, error: "no_transcript", errorMessage: "No speech was detected." };
  }

  // If no API key or no context, fall back to local parser immediately.
  if (!apiKey) {
    if (ctx) {
      const fallback = parseTextCharge(transcript, ctx);
      return { result: mapTextChargeResult(fallback, categories) };
    }
    return {
      result: {},
      error: "missing_key",
      errorMessage: "Gemini API key is not configured.",
    };
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
      // Fall back to local parser on API error
      if (ctx) {
        const fallback = parseTextCharge(transcript, ctx);
        return { result: mapTextChargeResult(fallback, categories) };
      }
      return {
        result: {},
        error: "api_error",
        errorMessage: `Gemini API returned ${res.status}.`,
      };
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text) {
      if (ctx) {
        const fallback = parseTextCharge(transcript, ctx);
        return { result: mapTextChargeResult(fallback, categories) };
      }
      return {
        result: {},
        error: "no_data",
        errorMessage: "The voice model returned an empty response.",
      };
    }

    // Strip markdown code fences and any trailing prose
    let jsonText = text;
    if (jsonText.includes("```")) {
      jsonText = jsonText
        .replace(/```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "");
    }
    // Extract first JSON object if the model added extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
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

    if (Object.keys(result).length === 0 && ctx) {
      // Gemini returned JSON but no usable fields; try local parser
      const fallback = parseTextCharge(transcript, ctx);
      return { result: mapTextChargeResult(fallback, categories) };
    }

    return { result };
  } catch (err) {
    console.error("Voice parse error:", err);
    if (ctx) {
      const fallback = parseTextCharge(transcript, ctx);
      return { result: mapTextChargeResult(fallback, categories) };
    }
    return {
      result: {},
      error: "parse_error",
      errorMessage: "Could not understand the voice input.",
    };
  }
}
