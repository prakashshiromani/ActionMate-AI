import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { createSessionToken } from "@/lib/session";

// POST /api/auth/session — verify Firebase ID token, issue HttpOnly session cookie
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const sessionToken = await createSessionToken(decoded.uid);

    const res = NextResponse.json({ success: true });
    res.cookies.set("actionmate_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    // Clear legacy plain-text cookie
    res.cookies.delete("actionmate_auth");
    return res;
  } catch (err: any) {
    console.error("Session creation failed:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// DELETE /api/auth/session — clear session cookie on logout
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("actionmate_session");
  res.cookies.delete("actionmate_auth");
  return res;
}
