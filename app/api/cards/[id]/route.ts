import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";

function getCardId(request: NextRequest, params: Promise<{ id: string }>): Promise<string> {
  const pathname = request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const urlId = pathname.split("/").pop() ?? "";
  if (urlId) return Promise.resolve(urlId);
  return params.then((p) => p.id);
}

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

  const cardId = await getCardId(request, params);

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

  const id = await getCardId(request, params);

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

  if (body.closing_day !== undefined) {
    if (body.closing_day === null) {
      updates.closing_day = null;
    } else if (
      typeof body.closing_day === "number" &&
      body.closing_day >= 1 &&
      body.closing_day <= 31
    ) {
      updates.closing_day = body.closing_day;
    } else {
      return NextResponse.json(
        { error: "Closing day must be between 1 and 31" },
        { status: 400 }
      );
    }
  }

  if (body.due_day !== undefined) {
    if (body.due_day === null) {
      updates.due_day = null;
    } else if (
      typeof body.due_day === "number" &&
      body.due_day >= 1 &&
      body.due_day <= 31
    ) {
      updates.due_day = body.due_day;
    } else {
      return NextResponse.json(
        { error: "Due day must be between 1 and 31" },
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

  const id = await getCardId(request, params);

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
