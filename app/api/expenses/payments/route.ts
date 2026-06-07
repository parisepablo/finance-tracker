import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const fixedExpenseId = body.fixed_expense_id;
  const paidMonth = body.paid_month;

  if (!fixedExpenseId || typeof fixedExpenseId !== "string") {
    return NextResponse.json({ error: "fixed_expense_id is required" }, { status: 400 });
  }

  if (!paidMonth || typeof paidMonth !== "string" || !/^\d{4}-\d{2}$/.test(paidMonth)) {
    return NextResponse.json({ error: "paid_month must be YYYY-MM" }, { status: 400 });
  }

  // Verify the expense belongs to the user
  const { data: expense, error: expenseError } = await supabase
    .from("fixed_expenses")
    .select("id")
    .eq("id", fixedExpenseId)
    .eq("user_id", user.id)
    .single();

  if (expenseError || !expense) {
    return NextResponse.json({ error: "Fixed expense not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("expense_payments")
    .insert({
      user_id: user.id,
      fixed_expense_id: fixedExpenseId,
      paid_month: paidMonth,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("unique constraint")) {
      return NextResponse.json({ error: "Already marked as paid for this month" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fixedExpenseId = searchParams.get("fixed_expense_id");
  const paidMonth = searchParams.get("paid_month");

  if (!fixedExpenseId || !paidMonth) {
    return NextResponse.json({ error: "fixed_expense_id and paid_month are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("expense_payments")
    .delete()
    .eq("user_id", user.id)
    .eq("fixed_expense_id", fixedExpenseId)
    .eq("paid_month", paidMonth);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
