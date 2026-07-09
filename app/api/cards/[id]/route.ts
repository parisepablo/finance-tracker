import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";
import { getEffectiveFixedExpenses } from "@/lib/effective-date";

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
    .select("*")
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
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  let start: string;
  let end: string;

  if (startParam && endParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam) && /^\d{4}-\d{2}-\d{2}$/.test(endParam)) {
    start = startParam;
    end = endParam;
  } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    start = `${monthParam}-01`;
    const [year, month] = monthParam.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    end = `${monthParam}-${String(lastDay).padStart(2, "0")}`;
  } else {
    return NextResponse.json({ data: card });
  }

  const effectiveMonth = monthParam ?? start.slice(0, 7);

  const [fixedExpenses, transactionsResult] = await Promise.all([
    getEffectiveFixedExpenses(supabase, user.id, effectiveMonth),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("credit_card_id", cardId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true }),
  ]);

  if (transactionsResult.error) {
    return NextResponse.json(
      { error: transactionsResult.error.message },
      { status: 500 }
    );
  }

  const breakdown: Array<{
    id: string;
    description: string;
    amount_cents: number;
    currency: "ARS" | "USD";
    type: "fixed" | "installment" | "single";
    date: string;
    purchase_date: string;
    current_installment?: number;
    total_installments?: number;
  }> = [];

  let totalDueArs = 0;
  let totalDueUsd = 0;

  for (const expense of fixedExpenses.filter((e) => e.credit_card_id === cardId && e.is_active)) {
    const monthly = getMonthlyEquivalent(expense.amount_cents, expense.billing_cycle);
    const expenseDate = expense.due_day
      ? `${start.slice(0, 7)}-${String(expense.due_day).padStart(2, "0")}`
      : start;
    breakdown.push({
      id: expense.id,
      description: expense.name,
      amount_cents: monthly,
      currency: "ARS",
      type: "fixed",
      date: expenseDate,
      purchase_date: expenseDate,
    });
    totalDueArs += monthly;
  }

  for (const tx of transactionsResult.data ?? []) {
    if (tx.is_installment && tx.total_installments && tx.current_installment) {
      const txDate = new Date(tx.date);
      const purchaseDate = new Date(txDate);
      purchaseDate.setMonth(purchaseDate.getMonth() - (tx.current_installment - 1));
      const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
      breakdown.push({
        id: tx.id,
        description: tx.description,
        amount_cents: tx.amount_cents,
        currency: tx.currency ?? "ARS",
        type: "installment",
        date: tx.date,
        purchase_date: purchaseDateStr,
        current_installment: tx.current_installment,
        total_installments: tx.total_installments,
      });
    } else {
      breakdown.push({
        id: tx.id,
        description: tx.description,
        amount_cents: tx.amount_cents,
        currency: tx.currency ?? "ARS",
        type: "single",
        date: tx.date,
        purchase_date: tx.date,
      });
    }
    if ((tx.currency ?? "ARS") === "USD") {
      totalDueUsd += tx.amount_cents;
    } else {
      totalDueArs += tx.amount_cents;
    }
  }

  // Sort chronologically by original purchase date, oldest to newest
  breakdown.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));

  return NextResponse.json({
    month: monthParam,
    total_due_ars_cents: totalDueArs,
    total_due_usd_cents: totalDueUsd,
    breakdown,
  });
}

export async function PATCH(
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

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.last_four !== undefined) {
    if (body.last_four === null) {
      updates.last_four = null;
    } else if (typeof body.last_four === "string" && body.last_four.length === 4) {
      updates.last_four = body.last_four;
    } else {
      return NextResponse.json(
        { error: "Last four must be exactly 4 digits" },
        { status: 400 }
      );
    }
  }

  if (body.credit_limit_cents !== undefined) {
    if (body.credit_limit_cents === null) {
      updates.credit_limit_cents = null;
    } else if (
      typeof body.credit_limit_cents === "number" &&
      body.credit_limit_cents > 0
    ) {
      updates.credit_limit_cents = body.credit_limit_cents;
    } else {
      return NextResponse.json(
        { error: "Credit limit must be a positive number" },
        { status: 400 }
      );
    }
  }

  if (body.currency !== undefined) {
    if (body.currency === "ARS" || body.currency === "USD") {
      updates.currency = body.currency;
    } else {
      return NextResponse.json(
        { error: "Currency must be ARS or USD" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("credit_cards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
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

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("credit_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
