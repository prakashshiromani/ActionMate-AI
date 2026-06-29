import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get("actionmate_session")?.value;

  let isAuthed = false;
  if (sessionToken) {
    const uid = await verifySessionToken(sessionToken);
    isAuthed = uid !== null;
  }

  if (pathname.startsWith("/dashboard") && !isAuthed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && isAuthed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
