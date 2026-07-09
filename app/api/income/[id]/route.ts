import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .from("income_sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Income source not found" },
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

  if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
    return NextResponse.json(
      { error: "is_active must be a boolean" },
      { status: 400 }
    );
  }

  if (body.currency !== undefined && !["ARS", "USD"].includes(body.currency)) {
    return NextResponse.json(
      { error: "Currency must be ARS or USD" },
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
      .from("income_sources")
      .update({ name: body.name.trim() })
      .eq("user_id", user.id)
      .eq("series_id", existing.series_id);

    if (renameError) {
      return NextResponse.json({ error: renameError.message }, { status: 500 });
    }
  }

  const versionUpdates: Record<string, unknown> = {};
  if (body.amount_cents !== undefined) versionUpdates.amount_cents = body.amount_cents;
  if (body.currency !== undefined) versionUpdates.currency = body.currency;
  if (body.is_active !== undefined) versionUpdates.is_active = body.is_active;

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
      .from("income_sources")
      .update(versionUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An income source version already exists for this month" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from("income_sources")
      .insert({
        user_id: user.id,
        series_id: existing.series_id,
        name: body.name ?? existing.name,
        amount_cents: versionUpdates.amount_cents ?? existing.amount_cents,
        currency: versionUpdates.currency ?? existing.currency,
        is_active: versionUpdates.is_active ?? existing.is_active,
        effective_from_month: targetMonth,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An income source version already exists for this month" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    result = data;
  }

  return NextResponse.json({ data: result });
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
    .from("income_sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Income source not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromMonth = searchParams.get("from_month");

  if (fromMonth && /^\d{4}-\d{2}$/.test(fromMonth)) {
    // Delete this and all future versions, then insert a deletion sentinel.
    await supabase
      .from("income_sources")
      .delete()
      .eq("user_id", user.id)
      .eq("series_id", existing.series_id)
      .gte("effective_from_month", fromMonth);

    const { error } = await supabase.from("income_sources").insert({
      user_id: user.id,
      series_id: existing.series_id,
      name: existing.name,
      amount_cents: existing.amount_cents,
      currency: existing.currency,
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
    .from("income_sources")
    .delete()
    .eq("series_id", existing.series_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
