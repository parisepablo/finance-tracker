import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyEquivalent } from "@/lib/utils";

const validCategories = [
  "Housing",
  "Subscriptions",
  "Transport",
  "Health",
  "Education",
  "Other",
];

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
    .select("*")
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

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
  }

  if (body.amount_cents !== undefined) {
    if (typeof body.amount_cents !== "number" || body.amount_cents <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !validCategories.includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  if (body.billing_cycle !== undefined && !["monthly", "quarterly", "annual"].includes(body.billing_cycle)) {
    return NextResponse.json(
      { error: "Billing cycle must be monthly, quarterly, or annual" },
      { status: 400 }
    );
  }

  if (body.payment_method !== undefined && !["cash", "debit", "credit_card"].includes(body.payment_method)) {
    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  }

  if (body.due_day !== undefined && (typeof body.due_day !== "number" || body.due_day < 1 || body.due_day > 31)) {
    return NextResponse.json(
      { error: "Due day must be between 1 and 31" },
      { status: 400 }
    );
  }

  if (body.is_estimated !== undefined && typeof body.is_estimated !== "boolean") {
    return NextResponse.json(
      { error: "is_estimated must be a boolean" },
      { status: 400 }
    );
  }

  if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
    return NextResponse.json(
      { error: "is_active must be a boolean" },
      { status: 400 }
    );
  }

  if (body.is_essential !== undefined && typeof body.is_essential !== "boolean") {
    return NextResponse.json(
      { error: "is_essential must be a boolean" },
      { status: 400 }
    );
  }

  const targetMonth =
    body.effective_from_month && /^\d{4}-\d{2}$/.test(body.effective_from_month)
      ? body.effective_from_month
      : existing.effective_from_month;

  // Rename all versions in the series when the name changes.
  if (body.name !== undefined && body.name.trim() !== existing.name) {
    const { error: renameError } = await supabase
      .from("fixed_expenses")
      .update({ name: body.name.trim() })
      .eq("user_id", user.id)
      .eq("series_id", existing.series_id);

    if (renameError) {
      return NextResponse.json({ error: renameError.message }, { status: 500 });
    }
  }

  const versionUpdates: Record<string, unknown> = {};
  if (body.amount_cents !== undefined) versionUpdates.amount_cents = body.amount_cents;
  if (body.category !== undefined) versionUpdates.category = body.category;
  if (body.billing_cycle !== undefined) versionUpdates.billing_cycle = body.billing_cycle;
  if (body.payment_method !== undefined) versionUpdates.payment_method = body.payment_method;
  if (body.due_day !== undefined) versionUpdates.due_day = body.due_day;
  if (body.is_estimated !== undefined) versionUpdates.is_estimated = body.is_estimated;
  if (body.is_active !== undefined) versionUpdates.is_active = body.is_active;
  if (body.is_essential !== undefined) versionUpdates.is_essential = body.is_essential;
  if (body.credit_card_id !== undefined) versionUpdates.credit_card_id = body.credit_card_id;

  const hasVersionUpdates = Object.keys(versionUpdates).length > 0;
  const isMovingEffectiveDate = targetMonth !== existing.effective_from_month;

  if (!hasVersionUpdates && !isMovingEffectiveDate) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  let result;

  if (targetMonth === existing.effective_from_month) {
    const { data, error } = await supabase
      .from("fixed_expenses")
      .update(versionUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A fixed expense version already exists for this month" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({
        user_id: user.id,
        series_id: existing.series_id,
        name: body.name ?? existing.name,
        category: versionUpdates.category ?? existing.category,
        amount_cents: versionUpdates.amount_cents ?? existing.amount_cents,
        billing_cycle: versionUpdates.billing_cycle ?? existing.billing_cycle,
        payment_method: versionUpdates.payment_method ?? existing.payment_method,
        due_day: versionUpdates.due_day ?? existing.due_day,
        credit_card_id: versionUpdates.credit_card_id ?? existing.credit_card_id,
        is_estimated: versionUpdates.is_estimated ?? existing.is_estimated,
        is_essential: versionUpdates.is_essential ?? existing.is_essential,
        is_active: versionUpdates.is_active ?? existing.is_active,
        effective_from_month: targetMonth,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A fixed expense version already exists for this month" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    result = data;
  }

  return NextResponse.json({
    data: {
      ...result,
      monthly_equivalent_cents: getMonthlyEquivalent(
        result.amount_cents,
        result.billing_cycle
      ),
    },
  });
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
    .from("fixed_expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Fixed expense not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromMonth = searchParams.get("from_month");

  if (fromMonth && /^\d{4}-\d{2}$/.test(fromMonth)) {
    // Delete this and all future versions, then insert a deletion sentinel.
    await supabase
      .from("fixed_expenses")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", existing.series_id)
      .gte("effective_from_month", fromMonth);

    const { error } = await supabase.from("fixed_expenses").insert({
      user_id: user.id,
      series_id: existing.series_id,
      name: existing.name,
      category: existing.category,
      amount_cents: existing.amount_cents,
      billing_cycle: existing.billing_cycle,
      payment_method: existing.payment_method,
      due_day: existing.due_day,
      credit_card_id: existing.credit_card_id,
      is_estimated: existing.is_estimated,
      is_essential: existing.is_essential,
      is_active: existing.is_active,
      effective_from_month: fromMonth,
      is_deleted: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // No from_month: delete the entire series (all history).
  const { error } = await supabase
    .from("fixed_expenses")
    .delete()
    .eq("series_id", existing.series_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
