import { randomUUID } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/auth/password";
import { ensureDefaultTaskTemplates } from "@/lib/standard-tasks";

export interface TestUser {
  userId: string;
  username: string;
  password: string;
}

export async function createTestUser(prefix = "test"): Promise<TestUser> {
  const supabase = createSupabaseAdmin();
  const username = `${prefix}_${randomUUID().slice(0, 8)}`;
  const password = `TestPass_${randomUUID().slice(0, 8)}!`;
  const { data, error } = await supabase.rpc("register_app_user", {
    p_username: username,
    p_password_hash: await hashPassword(password),
  });
  if (error) throw new Error(`register_app_user failed: ${error.message}`);
  const userId = data?.[0]?.user_id as string;
  if (!userId) throw new Error("register_app_user returned no user_id");

  const { error: seedErr } = await supabase.rpc("seed_user_defaults", {
    p_user_id: userId,
  });
  if (seedErr) throw new Error(`seed_user_defaults failed: ${seedErr.message}`);

  await ensureDefaultTaskTemplates(supabase, userId);

  return { userId, username, password };
}

export async function deleteTestUser(userId: string) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("app_users").delete().eq("id", userId);
  if (error) throw new Error(`deleteTestUser failed: ${error.message}`);
}

export async function withTestUser<T>(
  fn: (user: TestUser) => Promise<T>,
  prefix = "test",
): Promise<T> {
  const user = await createTestUser(prefix);
  try {
    return await fn(user);
  } finally {
    await deleteTestUser(user.userId);
  }
}

export function getAdmin() {
  return createSupabaseAdmin();
}
