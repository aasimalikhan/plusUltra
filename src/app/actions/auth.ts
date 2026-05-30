"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { ensureUserSeeded } from "@/lib/seed";

async function ensureProfile(userId: string, displayName: string) {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (data) return;
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    display_name: displayName,
  });
  if (error) throw new Error(error.message);
}

export async function signUpAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (username.length < 3) return "Username must be at least 3 characters.";
  if (password.length < 6) return "Password must be at least 6 characters.";

  const supabase = createSupabaseAdmin();
  const password_hash = await hashPassword(password);

  const { data: rows, error } = await supabase.rpc("register_app_user", {
    p_username: username,
    p_password_hash: password_hash,
  });

  if (error) {
    if (error.code === "23505") return "That username is already taken.";
    return error.message;
  }

  const user = rows?.[0] as { user_id: string; username: string } | undefined;
  if (!user?.user_id) return "Sign up failed. Run migration 0004_auth_fix.sql in Supabase.";

  await ensureUserSeeded(user.user_id);

  const session = await getSession();
  session.userId = user.user_id;
  session.username = user.username;
  session.isLoggedIn = true;
  await session.save();

  redirect("/today");
}

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return "Enter username and password.";

  const supabase = createSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("app_users")
    .select("id, username, password_hash")
    .eq("username", username)
    .limit(1);

  if (error) return error.message;
  const user = rows?.[0];
  if (!user) return "Wrong username or password.";

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return "Wrong username or password.";

  await ensureProfile(user.id, user.username);
  await ensureUserSeeded(user.id);

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.isLoggedIn = true;
  await session.save();

  redirect("/today");
}

export async function signOutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
