import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nextClosingDate, nextDueDate } from "@/lib/billing-cycles";

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

  const { data: card, error } = await supabase
    .from("credit_cards")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      last_four: body.last_four ?? null,
      credit_limit_cents: body.credit_limit_cents ?? null,
    })
    .select()
    .single();

  if (error || !card) {
    return NextResponse.json({ error: error?.message ?? "Failed to create card" }, { status: 500 });
  }

  // Create initial open billing cycle
  const closingDate = nextClosingDate(new Date());
  const dueDate = nextDueDate(closingDate);
  const openingDate = new Date(closingDate);
  openingDate.setDate(openingDate.getDate() - 29);

  const { error: cycleError } = await supabase
    .from("billing_cycles")
    .insert({
      credit_card_id: card.id,
      opening_date: openingDate.toISOString().split("T")[0],
      closing_date: closingDate.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      status: "open",
    });

  if (cycleError) {
    return NextResponse.json({ error: cycleError.message }, { status: 500 });
  }

  return NextResponse.json({ data: card }, { status: 201 });
}
