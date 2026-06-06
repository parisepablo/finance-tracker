import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .select("*")
    .eq("user_id", user.id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (data ?? []).map((expense) => ({
    ...expense,
    monthly_equivalent_cents: getMonthlyEquivalent(
      expense.amount_cents,
      expense.billing_cycle
    ),
  }));

  return NextResponse.json({ data: enriched });
}

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

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (typeof body.amount_cents !== "number" || body.amount_cents <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  const validCategories = [
    "Housing",
    "Subscriptions",
    "Transport",
    "Health",
    "Education",
    "Other",
  ];
  if (
    !body.category ||
    typeof body.category !== "string" ||
    !validCategories.includes(body.category)
  ) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  if (
    body.billing_cycle !== undefined &&
    !["monthly", "quarterly", "annual"].includes(body.billing_cycle)
  ) {
    return NextResponse.json(
      { error: "Billing cycle must be monthly, quarterly, or annual" },
      { status: 400 }
    );
  }

  if (
    body.payment_method !== undefined &&
    !["cash", "debit", "credit_card"].includes(body.payment_method)
  ) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  if (
    body.due_day !== undefined &&
    (typeof body.due_day !== "number" ||
      body.due_day < 1 ||
      body.due_day > 31)
  ) {
    return NextResponse.json(
      { error: "Due day must be between 1 and 31" },
      { status: 400 }
    );
  }

  if (
    body.is_estimated !== undefined &&
    typeof body.is_estimated !== "boolean"
  ) {
    return NextResponse.json(
      { error: "is_estimated must be a boolean" },
      { status: 400 }
    );
  }

  if (
    body.is_active !== undefined &&
    typeof body.is_active !== "boolean"
  ) {
    return NextResponse.json(
      { error: "is_active must be a boolean" },
      { status: 400 }
    );
  }

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    name: body.name.trim(),
    category: body.category,
    amount_cents: body.amount_cents,
    billing_cycle: body.billing_cycle ?? "monthly",
    payment_method: body.payment_method ?? "debit",
    is_estimated: body.is_estimated ?? false,
    is_active: body.is_active ?? true,
  };

  if (body.due_day !== undefined) {
    insertData.due_day = body.due_day;
  }

  if (body.payment_method === "credit_card" && body.credit_card_id) {
    insertData.credit_card_id = body.credit_card_id;
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        ...data,
        monthly_equivalent_cents: getMonthlyEquivalent(
          data.amount_cents,
          data.billing_cycle
        ),
      },
    },
    { status: 201 }
  );
}
