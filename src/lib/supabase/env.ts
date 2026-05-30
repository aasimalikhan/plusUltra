/**
 * Supabase client key: new dashboards use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * (sb_publishable_...). Legacy projects use NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT).
 * Either works with @supabase/ssr when RLS is enabled.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local (see .env.example).",
    );
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      "Missing Supabase API key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (recommended) " +
        "or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  return key;
}
