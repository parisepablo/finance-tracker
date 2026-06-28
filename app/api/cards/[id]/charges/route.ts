import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
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

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("credit_card_id", id)
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(
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

  const body = await request.json();

  if (!body.description || typeof body.description !== "string" || body.description.trim() === "") {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  if (typeof body.total_amount_cents !== "number" || body.total_amount_cents <= 0) {
    return NextResponse.json(
      { error: "Total amount must be a positive number" },
      { status: 400 }
    );
  }

  if (!body.date || typeof body.date !== "string") {
    return NextResponse.json({ error: "Purchase date is required" }, { status: 400 });
  }

  const isPaymentSource = !!body.payment_source_id;

  if (isPaymentSource) {
    const { data: source, error: sourceError } = await supabase
      .from("payment_sources")
      .select("id")
      .eq("id", body.payment_source_id)
      .eq("user_id", user.id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: "Payment source not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description: body.description.trim(),
        amount_cents: body.total_amount_cents,
        currency: "ARS",
        date: body.date,
        budget_category_id: body.budget_category_id ?? null,
        credit_card_id: null,
        payment_source_id: body.payment_source_id,
        fixed_expense_id: null,
        is_installment: false,
        total_installments: null,
        current_installment: null,
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  }

  const { data: card, error: cardError } = await supabase
    .from("credit_cards")
    .select("id, currency")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const isInstallment = !!body.is_installment;
  const totalInstallments = isInstallment
    ? typeof body.total_installments === "number" && body.total_installments > 0
      ? body.total_installments
      : 1
    : 1;

  if (isInstallment && (!body.total_installments || body.total_installments < 2)) {
    return NextResponse.json(
      { error: "Total installments must be at least 2 for installment purchases" },
      { status: 400 }
    );
  }

  const installmentAmount = Math.round(body.total_amount_cents / totalInstallments);
  const remainder = body.total_amount_cents - installmentAmount * totalInstallments;

  const purchaseDate = new Date(body.date);

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < totalInstallments; i++) {
    const date = new Date(purchaseDate);
    date.setMonth(date.getMonth() + i);

    let amount = installmentAmount;
    if (i === 0) {
      amount += remainder;
    }

    rows.push({
      user_id: user.id,
      description: body.description.trim(),
      amount_cents: amount,
      currency: card.currency ?? "ARS",
      date: date.toISOString().split("T")[0],
      budget_category_id: body.budget_category_id ?? null,
      credit_card_id: cardId,
      payment_source_id: null,
      fixed_expense_id: null,
      is_installment: isInstallment,
      total_installments: isInstallment ? totalInstallments : null,
      current_installment: isInstallment ? i + 1 : null,
    });
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
