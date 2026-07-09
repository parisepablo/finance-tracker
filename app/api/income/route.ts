import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonth } from "@/lib/utils";
import { getEffectiveIncomeSources } from "@/lib/effective-date";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : getCurrentMonth();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getEffectiveIncomeSources(supabase, user.id, month);

  return NextResponse.json({ data });
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

  if (
    body.is_active !== undefined &&
    typeof body.is_active !== "boolean"
  ) {
    return NextResponse.json(
      { error: "is_active must be a boolean" },
      { status: 400 }
    );
  }

  if (
    body.currency !== undefined &&
    !["ARS", "USD"].includes(body.currency)
  ) {
    return NextResponse.json(
      { error: "Currency must be ARS or USD" },
      { status: 400 }
    );
  }

  const effectiveFromMonth = body.effective_from_month && /^\d{4}-\d{2}$/.test(body.effective_from_month)
    ? body.effective_from_month
    : getCurrentMonth();

  const { data, error } = await supabase
    .from("income_sources")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      amount_cents: body.amount_cents,
      currency: body.currency ?? "ARS",
      is_active: body.is_active ?? true,
      effective_from_month: effectiveFromMonth,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An income source with this name already has a version starting this month" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
