import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAlerts } from "@/lib/generate-alerts";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await generateAlerts(user.id, supabase);
    return NextResponse.json({ generated: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to generate alerts:", message);
    return NextResponse.json(
      { error: "Failed to generate alerts" },
      { status: 500 }
    );
  }
}
