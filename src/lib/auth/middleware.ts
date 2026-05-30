import { getIronSession } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionOptions } from "./session-options";
import type { SessionData } from "./session";

export async function updateAuthSession(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  let session: SessionData;
  try {
    session = await getIronSession<SessionData>(
      request,
      response,
      getSessionOptions(),
    );
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const pathname = request.nextUrl.pathname;
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons");

  const loggedIn = session.isLoggedIn && !!session.userId;

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (loggedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return response;
}
