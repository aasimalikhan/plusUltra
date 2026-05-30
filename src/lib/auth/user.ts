import { redirect } from "next/navigation";
import { getSession, type SessionData } from "./session";

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  return session;
}

export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
