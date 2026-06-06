import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";

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
    .from("fixed_expenses")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Fixed expense not found" },
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

  if (body.amount_cents !== undefined) {
    if (typeof body.amount_cents !== "number" || body.amount_cents <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }
    updates.amount_cents = body.amount_cents;
  }

  const validCategories = [
    "Housing",
    "Subscriptions",
    "Transport",
    "Health",
    "Education",
    "Other",
  ];
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !validCategories.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updates.category = body.category;
  }

  if (body.billing_cycle !== undefined) {
    if (!["monthly", "quarterly", "annual"].includes(body.billing_cycle)) {
      return NextResponse.json(
        { error: "Billing cycle must be monthly, quarterly, or annual" },
        { status: 400 }
      );
    }
    updates.billing_cycle = body.billing_cycle;
  }

  if (body.payment_method !== undefined) {
    if (!["cash", "debit", "credit_card"].includes(body.payment_method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }
    updates.payment_method = body.payment_method;
  }

  if (body.due_day !== undefined) {
    if (typeof body.due_day !== "number" || body.due_day < 1 || body.due_day > 31) {
      return NextResponse.json(
        { error: "Due day must be between 1 and 31" },
        { status: 400 }
      );
    }
    updates.due_day = body.due_day;
  }

  if (body.is_estimated !== undefined) {
    if (typeof body.is_estimated !== "boolean") {
      return NextResponse.json(
        { error: "is_estimated must be a boolean" },
        { status: 400 }
      );
    }
    updates.is_estimated = body.is_estimated;
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { error: "is_active must be a boolean" },
        { status: 400 }
      );
    }
    updates.is_active = body.is_active;
  }

  if (body.credit_card_id !== undefined) {
    if (body.credit_card_id === null) {
      updates.credit_card_id = null;
    } else {
      updates.credit_card_id = body.credit_card_id;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("fixed_expenses")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      ...data,
      monthly_equivalent_cents: getMonthlyEquivalent(
        data.amount_cents,
        data.billing_cycle
      ),
    },
  });
}

export async function DELETE(
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

  const { data: existing, error: fetchError } = await supabase
    .from("fixed_expenses")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Fixed expense not found" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
