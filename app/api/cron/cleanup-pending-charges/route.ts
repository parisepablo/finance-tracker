import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  cleanupOldPendingCharges,
  scrubOldRawInput,
} from "@/lib/data/pending-charges";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Default retention: 7 days
  const retentionDays = 7;

  const deleted = await cleanupOldPendingCharges(supabase, retentionDays);
  const scrubbed = await scrubOldRawInput(supabase, retentionDays);

  return NextResponse.json({
    deleted_rows: deleted,
    scrubbed_rows: scrubbed,
  });
}
