import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function ensureUserSeeded(userId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("seed_user_defaults", { p_user_id: userId });
  if (error) {
    console.error("seed_user_defaults failed", error);
  }
}
