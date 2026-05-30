import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. Get it from Supabase → Settings → API → service_role / secret key.",
    );
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
