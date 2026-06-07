import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;

  const { data: card, error: cardError } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Invalid month format. Use YYYY-MM" },
      { status: 400 }
    );
  }

  const start = `${monthParam}-01`;
  const [year, month] = monthParam.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthParam}-${String(lastDay).padStart(2, "0")}`;

  const [fixedResult, transactionsResult] = await Promise.all([
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("credit_card_id", cardId)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("credit_card_id", cardId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true }),
  ]);

  if (fixedResult.error || transactionsResult.error) {
    return NextResponse.json(
      { error: fixedResult.error?.message || transactionsResult.error?.message },
      { status: 500 }
    );
  }

  const breakdown: Array<{
    id: string;
    description: string;
    amount_cents: number;
    type: "fixed" | "installment" | "single";
    current_installment?: number;
    total_installments?: number;
  }> = [];

  let totalDue = 0;

  for (const expense of fixedResult.data ?? []) {
    const monthly = getMonthlyEquivalent(expense.amount_cents, expense.billing_cycle);
    breakdown.push({
      id: expense.id,
      description: expense.name,
      amount_cents: monthly,
      type: "fixed",
    });
    totalDue += monthly;
  }

  for (const tx of transactionsResult.data ?? []) {
    if (tx.is_installment && tx.total_installments && tx.current_installment) {
      breakdown.push({
        id: tx.id,
        description: tx.description,
        amount_cents: tx.amount_cents,
        type: "installment",
        current_installment: tx.current_installment,
        total_installments: tx.total_installments,
      });
    } else {
      breakdown.push({
        id: tx.id,
        description: tx.description,
        amount_cents: tx.amount_cents,
        type: "single",
      });
    }
    totalDue += tx.amount_cents;
  }

  return NextResponse.json({
    month: monthParam,
    total_due_cents: totalDue,
    breakdown,
  });
}
