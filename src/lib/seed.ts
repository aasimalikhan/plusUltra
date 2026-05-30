import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function ensureUserSeeded(userId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc("seed_user_defaults", {
    p_user_id: userId,
  });
  if (error) {
    console.error("seed_user_defaults failed", error);
  }
}
