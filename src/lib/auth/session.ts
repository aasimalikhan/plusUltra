import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "./session-options";

export interface SessionData {
  userId: string;
  username: string;
  isLoggedIn: boolean;
}

export async function getSession() {
  return getIronSession<SessionData>(cookies(), getSessionOptions());
}
