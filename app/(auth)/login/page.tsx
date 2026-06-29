"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createServerSession = async (user: any, accessToken?: string) => {
    const idToken = await user.getIdToken();
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (accessToken) sessionStorage.setItem("googleAccessToken", accessToken);
  };

  // Capture the sign-in redirect result when page loads/mounts after returning from Google
  useEffect(() => {
    sessionStorage.clear();
    if (!auth || !auth.app) return;

    setLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken;
          await createServerSession(result.user, accessToken ?? undefined);
          router.push("/dashboard");
        }
      })
      .catch((err: any) => {
        console.error("Redirect Sign-In Error:", err);
        setError(err.message || "Redirect authentication failed.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    provider.addScope("https://www.googleapis.com/auth/gmail.compose");
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      if (!auth || !auth.app) {
        setError("Authentication service unavailable. Please try again later.");
        setLoading(false);
        return;
      }

      // Check if mobile device to automatically redirect
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return;
      }

      // Try popup mode on desktop
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        await createServerSession(result.user, accessToken ?? undefined);
        router.push("/dashboard");
      } catch (popupError: any) {
        if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/cancelled-popup-request") {
          console.warn("Popup blocked or failed, falling back to Redirect Mode:", popupError);
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        console.warn("Google Sign-In: Popup closed by user.");
        setError("Sign-in popup was closed by user.");
      } else {
        console.error("Google Sign-In Error:", err);
        setError(err.message || "Failed to sign in with Google. Please try again.");
      }
      setLoading(false);
    }
  };

  const handleSandboxBypass = () => {
    console.warn("Bypassing Firebase Auth. Entering Simulated Sandbox Mode.");
    sessionStorage.setItem("googleAccessToken", "mock-sandbox-token");
    document.cookie = "actionmate_auth=1; path=/; max-age=86400; SameSite=Lax";
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-bg-base overflow-hidden text-text-primary">
      {/* Top-left Back to Home Link */}
      <div className="absolute top-6 left-6 z-50">
        <Link
          href="/"
          className="text-xs text-text-muted hover:text-text-primary font-bold flex items-center gap-1.5 transition"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Left side: Tagline art and features (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-bg-surface to-bg-base border-r border-border/40 relative select-none">
        {/* Ambient blur */}
        <div className="pointer-events-none absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full opacity-10 blur-3xl bg-accent-primary" />
        
        <div className="flex items-center gap-2.5 relative">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-ai flex items-center justify-center text-white text-xs font-bold shadow-md">
            🤖
          </div>
          <span className="font-bold text-sm tracking-tight">ActionMate AI</span>
        </div>

        <div className="space-y-6 relative max-w-md my-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Don&apos;t just remind.<br/>
            <span className="text-accent-primary bg-gradient-to-r from-accent-primary to-accent-ai bg-clip-text text-transparent">Resolve.</span>
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Your voice/text assistant scans your upcoming tasks, schedules focus blocks in Google Calendar, and drafts extension emails in Gmail automatically.
          </p>
          
          <div className="space-y-3.5 pt-4">
            {[
              { title: "Smart Scheduling", desc: "Locks in deep work blocks around calendar conflicts." },
              { title: "Gmail Autopilot", desc: "Drafts extension requests to Profs/Clients." },
              { title: "Voice Control Logs", desc: "Speak natural language; agent plans and resolves." }
            ].map((feat, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-accent-primary font-bold text-sm">✓</span>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-text-primary block">{feat.title}</span>
                  <span className="text-[11px] text-text-muted block">{feat.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-text-muted relative flex items-center gap-1.5">
          <span>Powered by</span>
          <span className="font-bold text-accent-ai bg-accent-ai/10 border border-accent-ai/20 px-2 py-0.5 rounded-full text-[10px]">Gemini 2.0 Flash</span>
        </div>
      </div>

      {/* Right side: Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-bg-surface p-8 shadow-2xl transition-all duration-300 hover:border-accent-primary/30">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-ai text-3xl shadow-lg">
              🤖
            </div>
            <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-text-primary">
              ActionMate AI
            </h2>
            <p className="mt-2 text-sm italic text-accent-ai font-medium">
              Don't just remind. Resolve.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="text-center text-sm text-text-muted">
              <p>Welcome back! Let's get things scheduled and resolved.</p>
            </div>

            {error && (
              <div className="space-y-3">
                <div className="rounded-lg bg-error/10 border border-error/30 p-4 text-sm text-error text-center">
                  {error}
                </div>
                {process.env.NODE_ENV !== "production" && (
                  <button
                    onClick={handleSandboxBypass}
                    type="button"
                    className="w-full bg-bg-raised hover:bg-bg-surface border border-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-all text-center cursor-pointer"
                  >
                    Proceed in Demo Mode (No sign-in needed) 🧪
                  </button>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg bg-accent-primary py-3 px-4 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {/* Google Logo SVG */}
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.532 0-6.4-2.868-6.4-6.4s2.868-6.4 6.4-6.4c1.582 0 3.024.576 4.14 1.524l3.12-3.12C19.296 2.22 15.984 1 12.24 1 6.036 1 1 6.036 1 12.24s5.036 11.24 11.24 11.24c6.48 0 10.74-4.56 10.74-10.92 0-.744-.084-1.284-.216-2.275H12.24z"
                      />
                    </svg>
                    Sign in with Google
                  </span>
                )}
              </button>

              {process.env.NODE_ENV !== "production" && (
                <button
                  onClick={handleSandboxBypass}
                  type="button"
                  className="w-full flex justify-center items-center gap-2 rounded-lg border border-border bg-bg-surface hover:bg-bg-raised py-2.5 px-4 text-sm font-semibold text-text-primary transition-all duration-200 cursor-pointer"
                >
                  ✨ Try Demo (No sign-in needed)
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 text-center text-xs text-text-muted font-medium">
            Secured with Firebase Auth & Google OAuth
          </div>
        </div>
      </div>
    </div>
  );
}
