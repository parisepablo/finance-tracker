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
