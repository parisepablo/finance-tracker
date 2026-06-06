import { createClient } from "@/lib/supabase/server";
import { IncomePageClient } from "@/components/income/IncomePageClient";

async function getIncomeSources() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: [], error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export default async function IncomePage() {
  const { data, error } = await getIncomeSources();

  return <IncomePageClient incomeSources={data} error={error} />;
}
