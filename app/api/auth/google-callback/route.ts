import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const rawState = searchParams.get("state") ?? "";

    // State format: "uid:nonce" (URL-decoded)
    const decodedState = decodeURIComponent(rawState);
    const colonIdx = decodedState.indexOf(":");
    const userId = colonIdx !== -1 ? decodedState.slice(0, colonIdx) : decodedState;
    const nonce = colonIdx !== -1 ? decodedState.slice(colonIdx + 1) : null;

    if (!code || !userId) {
      return NextResponse.json(
        { error: "Authorization code and user state (uid) are required" },
        { status: 400 }
      );
    }

    // Verify nonce from cookie to prevent CSRF account-linking attacks
    const cookieNonce = req.cookies.get("oauth_nonce")?.value;
    if (nonce && cookieNonce && nonce !== cookieNonce) {
      return NextResponse.json({ error: "Invalid OAuth state — CSRF check failed" }, { status: 403 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google-callback";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Google OAuth credentials are not fully configured on the server." },
        { status: 500 }
      );
    }

    // Exchange authorization code for access and refresh tokens
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        access_type: "offline",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Google Token Exchange failed: ${response.status} - ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const refreshToken = data.refresh_token;
    const accessToken = data.access_token;

    if (!refreshToken) {
      console.warn("No refresh token returned from Google. User may need to re-consent.");
    }

    // Update the user's Firestore document with the new Google credentials
    const userDocRef = adminDb.collection("users").doc(userId);
    const updatePayload: Record<string, any> = {
      googleConnected: true,
      updatedAt: new Date(),
    };

    if (refreshToken) {
      updatePayload.googleRefreshToken = refreshToken;
    }
    // accessToken is short-lived — not stored to reduce sensitive data exposure

    await userDocRef.set(updatePayload, { merge: true });

    // Redirect the user back to the dashboard with a success query parameter
    const redirectUrl = new URL("/dashboard", req.url);
    redirectUrl.searchParams.set("googleConnected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during Google authorization callback" },
      { status: 500 }
    );
  }
}
