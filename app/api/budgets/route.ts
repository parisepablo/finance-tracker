import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sumIncomeSources,
  sumFixedExpenses,
  getDiscretionaryPool,
  getMonthRangeFromParam,
} from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");

  const monthStr = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : undefined;

  const { start, end } = getMonthRangeFromParam(monthStr);

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    categoriesResult,
    incomeResult,
    expensesResult,
    transactionsResult,
  ] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("budget_category_id, amount_cents")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .not("budget_category_id", "is", null),
  ]);

  if (categoriesResult.error) {
    return NextResponse.json(
      { error: categoriesResult.error.message },
      { status: 500 }
    );
  }

  const income = sumIncomeSources(incomeResult.data ?? []);
  const fixed = sumFixedExpenses(expensesResult.data ?? []);
  const pool = getDiscretionaryPool(income, fixed);

  const spentByCategory: Record<string, number> = {};
  for (const tx of transactionsResult.data ?? []) {
    if (tx.budget_category_id) {
      spentByCategory[tx.budget_category_id] =
        (spentByCategory[tx.budget_category_id] ?? 0) + tx.amount_cents;
    }
  }

  const enriched = (categoriesResult.data ?? []).map((cat) => {
    const allocated = Math.round((pool * cat.percentage) / 100);
    const spent = spentByCategory[cat.id] ?? 0;
    const remaining = allocated - spent;
    const spentPct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      ...cat,
      allocated_cents: allocated,
      spent_cents: spent,
      remaining_cents: remaining,
      spent_percentage: spentPct,
    };
  });

  return NextResponse.json({
    data: enriched,
    discretionary_pool_cents: pool,
  });
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
    typeof body.percentage !== "number" ||
    body.percentage < 1 ||
    body.percentage > 100
  ) {
    return NextResponse.json(
      { error: "Percentage must be between 1 and 100" },
      { status: 400 }
    );
  }

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!body.color || typeof body.color !== "string" || !hexRegex.test(body.color)) {
    return NextResponse.json(
      { error: "Color must be a valid hex code" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("budget_categories")
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      percentage: body.percentage,
      color: body.color,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
