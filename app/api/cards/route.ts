import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .from("credit_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
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

  if (
    body.last_four !== undefined &&
    (typeof body.last_four !== "string" || body.last_four.length !== 4)
  ) {
    return NextResponse.json(
      { error: "Last four must be exactly 4 digits" },
      { status: 400 }
    );
  }

  if (
    body.credit_limit_cents !== undefined &&
    (typeof body.credit_limit_cents !== "number" || body.credit_limit_cents <= 0)
  ) {
    return NextResponse.json(
      { error: "Credit limit must be a positive number" },
      { status: 400 }
    );
  }

  if (
    body.closing_day !== undefined &&
    (typeof body.closing_day !== "number" ||
      body.closing_day < 1 ||
      body.closing_day > 31)
  ) {
    return NextResponse.json(
      { error: "Closing day must be between 1 and 31" },
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

  const { data, error } = await supabase
    .from("credit_cards")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      last_four: body.last_four ?? null,
      credit_limit_cents: body.credit_limit_cents ?? null,
      closing_day: body.closing_day ?? null,
      due_day: body.due_day ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
