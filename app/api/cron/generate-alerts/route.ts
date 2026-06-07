import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateAlerts } from "@/lib/generate-alerts";

export async function GET(request: NextRequest) {
  // Protect cron endpoint with secret token
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get distinct user_ids from app tables
  const [incomeResult, expenseResult, cardResult] = await Promise.all([
    supabase.from("income_sources").select("user_id").limit(1000),
    supabase.from("fixed_expenses").select("user_id").limit(1000),
    supabase.from("credit_cards").select("user_id").limit(1000),
  ]);

  const allIds = [
    ...(incomeResult.data ?? []),
    ...(expenseResult.data ?? []),
    ...(cardResult.data ?? []),
  ].map((u) => u.user_id);

  const userIds = [...new Set(allIds)];

  let totalAlerts = 0;

  for (const userId of userIds) {
    try {
      const count = await generateAlerts(userId, supabase);
      totalAlerts += count;
    } catch (err) {
      console.error(`Failed to generate alerts for user ${userId}:`, err);
    }
  }

  return NextResponse.json({
    processed: userIds.length,
    total_alerts_created: totalAlerts,
  });
}
