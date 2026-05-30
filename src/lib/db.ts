import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/user";

/** Server-only DB access scoped to the logged-in user. */
export async function getServerDb() {
  const user = await requireUser();
  return {
    supabase: createSupabaseAdmin(),
    userId: user.userId,
    username: user.username,
  };
}

/** Like getServerDb but returns null when not logged in. */
export async function getServerDbOptional() {
  const { getCurrentUser } = await import("@/lib/auth/user");
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    supabase: createSupabaseAdmin(),
    userId: user.userId,
    username: user.username,
  };
}
