import { NextResponse } from "next/server";
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

  const [{ count, error: countError }, { count: criticalCount, error: criticalError }] =
    await Promise.all([
      supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("priority", "critical"),
    ]);

  if (countError || criticalError) {
    return NextResponse.json(
      { error: countError?.message || criticalError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    unread: count ?? 0,
    hasCritical: (criticalCount ?? 0) > 0,
  });
}
