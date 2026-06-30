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

  useEffect(() => {
    if (!auth || !auth.app) return;

    setLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log("Redirect sign-in successful for:", result.user.email);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const accessToken = credential?.accessToken;
          await createServerSession(result.user, accessToken ?? undefined);
          router.push("/dashboard");
        } else {
          // No redirect result — user landed on login page normally.
          // Safe to clear app-specific session data now.
          sessionStorage.removeItem("googleAccessToken");
        }
      })
      .catch((err: any) => {
        console.error("Redirect Sign-In Error:", err);
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
          setError("Sign-in was cancelled. Please try again.");
        } else {
          setError(err.message || "Redirect authentication failed.");
        }
        // Clear app-specific data on error
        sessionStorage.removeItem("googleAccessToken");
      })
      .finally(() => {
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Always try popup first — it's more reliable even on mobile.
      // signInWithRedirect has known issues where state gets lost across
      // page reloads on many mobile browsers.

      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        await createServerSession(result.user, accessToken ?? undefined);
        router.push("/dashboard");
      } catch (popupError: any) {
        if (popupError.code === "auth/popup-blocked" || popupError.code === "auth/cancelled-popup-request") {
          if (isMobile) {
            // On mobile, popup might be blocked by the browser.
            // Try redirect as last resort, but warn user.
            console.warn("Popup blocked on mobile, trying redirect:", popupError);
            await signInWithRedirect(auth, provider);
          } else {
            console.warn("Popup blocked, falling back to Redirect:", popupError);
            await signInWithRedirect(auth, provider);
          }
        } else {
          throw popupError;
        }
      }
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
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

  const features = [
    {
      icon: "🗓️",
      title: "Smart Scheduling",
      desc: "Locks in deep work blocks around your calendar conflicts automatically.",
    },
    {
      icon: "✉️",
      title: "Gmail Autopilot",
      desc: "Drafts extension requests to professors and clients in seconds.",
    },
    {
      icon: "🎙️",
      title: "Voice Control",
      desc: "Speak naturally — the agent plans, schedules, and resolves for you.",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .lp-root {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: #050A18;
          display: flex;
          overflow: hidden;
          position: relative;
          color: #F1F5F9;
        }

        .lp-bg-mesh {
          position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
        }
        .lp-bg-mesh::before {
          content: '';
          position: absolute; top: -15%; left: -5%;
          width: 650px; height: 650px; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 68%);
          animation: lp-orb1 13s ease-in-out infinite alternate;
        }
        .lp-bg-mesh::after {
          content: '';
          position: absolute; bottom: -20%; right: -10%;
          width: 700px; height: 700px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 68%);
          animation: lp-orb2 16s ease-in-out infinite alternate;
        }
        .lp-orb3 {
          position: fixed; top: 40%; left: 38%;
          width: 450px; height: 450px; border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 68%);
          animation: lp-orb3 20s ease-in-out infinite alternate;
          z-index: 0; pointer-events: none;
        }
        @keyframes lp-orb1 { from{transform:translate(0,0) scale(1)} to{transform:translate(70px,55px) scale(1.15)} }
        @keyframes lp-orb2 { from{transform:translate(0,0) scale(1)} to{transform:translate(-55px,-70px) scale(1.2)} }
        @keyframes lp-orb3 { from{transform:translate(0,0) scale(1)} to{transform:translate(35px,-35px) scale(1.1)} }

        .lp-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 44px 44px;
        }

        .lp-left {
          display: none;
          position: relative; z-index: 1;
        }
        @media (min-width: 1024px) {
          .lp-left {
            display: flex;
            width: 50%;
            flex-direction: column;
            justify-content: space-between;
            padding: 3rem;
            border-right: 1px solid rgba(255,255,255,0.055);
          }
        }

        .lp-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative; z-index: 1;
        }

        .lp-logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 99px;
          padding: 6px 14px 6px 6px;
          backdrop-filter: blur(10px);
        }
        .lp-logo-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 14px rgba(59,130,246,0.4);
        }
        .lp-logo-text { font-size: 13px; font-weight: 700; color: #F1F5F9; letter-spacing: -0.02em; }

        .lp-status-pill {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.22);
          border-radius: 99px;
          padding: 4px 13px;
          font-size: 11px; font-weight: 600; color: #34D399;
          margin-bottom: 1.5rem;
        }
        .lp-status-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #34D399;
          animation: lp-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.45;transform:scale(0.75)}
        }

        .lp-hero {
          font-size: clamp(2.6rem, 3.8vw, 3.8rem);
          font-weight: 900;
          line-height: 1.06;
          letter-spacing: -0.045em;
          color: #F1F5F9;
          margin: 0;
        }
        .lp-hero .gr {
          background: linear-gradient(110deg, #60A5FA 0%, #A78BFA 50%, #34D399 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-sub {
          font-size: 13.5px;
          line-height: 1.7;
          color: rgba(241,245,249,0.45);
          max-width: 390px;
          margin-top: 1rem;
        }

        .lp-feat {
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          display: flex; align-items: flex-start; gap: 13px;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          cursor: default;
        }
        .lp-feat:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
        .lp-feat-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; flex-shrink: 0;
        }
        .lp-feat-title { font-size: 13px; font-weight: 700; color: #F1F5F9; margin-bottom: 3px; }
        .lp-feat-desc { font-size: 12px; color: rgba(241,245,249,0.42); line-height: 1.5; }

        .lp-powered {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; color: rgba(241,245,249,0.38);
        }
        .lp-gemini-chip {
          background: rgba(139,92,246,0.12);
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 99px; padding: 3px 10px;
          font-size: 11px; font-weight: 700; color: #A78BFA;
        }

        /* Card */
        .lp-card {
          width: 100%; max-width: 420px;
          background: rgba(10,16,35,0.8);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 26px;
          padding: 42px 38px 36px;
          backdrop-filter: blur(28px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 40px 90px rgba(0,0,0,0.55),
            0 0 80px rgba(59,130,246,0.05);
          animation: lp-card-in 0.65s cubic-bezier(0.16,1,0.3,1) both;
          position: relative;
          overflow: hidden;
        }
        .lp-card::before {
          content: '';
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 55%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(59,130,246,0.6), transparent);
        }
        @keyframes lp-card-in {
          from{opacity:0;transform:translateY(28px) scale(0.97)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }

        .lp-card-icon {
          width: 66px; height: 66px; border-radius: 20px;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; margin: 0 auto 22px;
          box-shadow: 0 10px 36px rgba(59,130,246,0.38), 0 0 0 1px rgba(255,255,255,0.12) inset;
          animation: lp-float 4s ease-in-out infinite;
        }
        @keyframes lp-float {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-7px)}
        }

        .lp-card-title {
          font-size: 27px; font-weight: 800; letter-spacing: -0.04em;
          color: #F1F5F9; text-align: center; margin: 0;
        }
        .lp-card-tagline {
          text-align: center; font-size: 12px;
          font-style: italic; font-weight: 500;
          color: #A78BFA; margin-top: 6px;
        }
        .lp-card-sub {
          text-align: center; font-size: 13px;
          color: rgba(241,245,249,0.42);
          margin-top: 16px; line-height: 1.6;
        }

        .lp-divider {
          display: flex; align-items: center; gap: 11px;
          margin: 22px 0;
        }
        .lp-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .lp-divider-txt {
          font-size: 11px; color: rgba(241,245,249,0.22);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em;
        }

        .lp-btn-google {
          position: relative;
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 13px 20px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
          color: #fff; font-family: 'Inter', sans-serif;
          font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 5px 22px rgba(59,130,246,0.38), 0 0 0 1px rgba(255,255,255,0.1) inset;
          overflow: hidden;
        }
        .lp-btn-google::before {
          content: '';
          position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transition: left 0.5s ease;
        }
        .lp-btn-google:hover::before { left: 100%; }
        .lp-btn-google:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(59,130,246,0.48), 0 0 0 1px rgba(255,255,255,0.14) inset;
        }
        .lp-btn-google:active { transform: translateY(0); }
        .lp-btn-google:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .lp-btn-sandbox {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 20px; border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(241,245,249,0.55);
          font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.22s ease;
        }
        .lp-btn-sandbox:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.13);
          color: rgba(241,245,249,0.85);
          transform: translateY(-1px);
        }

        .lp-error {
          border-radius: 11px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          padding: 12px 14px;
          font-size: 12px; color: #FCA5A5;
          text-align: center; line-height: 1.5;
          margin-bottom: 12px;
        }

        .lp-security {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 11px; color: rgba(241,245,249,0.22);
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 10px;
        }

        .lp-back {
          position: absolute; top: 24px; left: 24px; z-index: 50;
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: rgba(241,245,249,0.32);
          text-decoration: none;
          transition: color 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        .lp-back:hover { color: rgba(241,245,249,0.72); }

        /* Stagger in */
        .lp-s1{animation:lp-si 0.5s 0.08s cubic-bezier(0.16,1,0.3,1) both}
        .lp-s2{animation:lp-si 0.5s 0.18s cubic-bezier(0.16,1,0.3,1) both}
        .lp-s3{animation:lp-si 0.5s 0.26s cubic-bezier(0.16,1,0.3,1) both}
        .lp-s4{animation:lp-si 0.5s 0.34s cubic-bezier(0.16,1,0.3,1) both}
        .lp-s5{animation:lp-si 0.5s 0.42s cubic-bezier(0.16,1,0.3,1) both}
        .lp-s6{animation:lp-si 0.5s 0.5s cubic-bezier(0.16,1,0.3,1) both}
        @keyframes lp-si{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}

        @keyframes lp-spin{to{transform:rotate(360deg)}}
        .lp-spin{animation:lp-spin 0.8s linear infinite}
      `}</style>

      <div className="lp-root">
        <div className="lp-bg-mesh" />
        <div className="lp-grid" />
        <div className="lp-orb3" />

        <Link href="/" className="lp-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </Link>

        {/* Left panel */}
        <div className="lp-left">
          <div className="lp-logo-badge lp-s1">
            <div className="lp-logo-icon">
              {/* Premium Intersecting Spark Logo — Sleek Senior Developer Look */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9L13 12L12 15L11 12L12 9Z"
                  fill="white"
                  opacity="0.9"
                />
              </svg>
            </div>
            <span className="lp-logo-text">ActionMate AI</span>
          </div>

          <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'2.5rem 0'}}>
            <div className="lp-s2">
              <div className="lp-status-pill">
                <span className="lp-status-dot" />
                AI-Powered Productivity
              </div>
            </div>

            <h1 className="lp-hero lp-s2">
              Don&apos;t just<br />
              remind.<br />
              <span className="gr">Resolve.</span>
            </h1>
            <p className="lp-sub lp-s3">
              Your AI assistant that scans upcoming tasks, schedules focus blocks in Google Calendar, and drafts emails — automatically.
            </p>

            <div style={{display:'flex', flexDirection:'column', gap:'10px', marginTop:'1.8rem'}}>
              {features.map((feat, i) => (
                <div key={i} className={`lp-feat lp-s${i + 4}`}>
                  <div className="lp-feat-icon">{feat.icon}</div>
                  <div>
                    <div className="lp-feat-title">{feat.title}</div>
                    <div className="lp-feat-desc">{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-powered lp-s6">
            <span>Powered by</span>
            <span className="lp-gemini-chip">✦ Gemini 2.0 Flash</span>
          </div>
        </div>

        {/* Right panel / card */}
        <div className="lp-right">
          <div className="lp-card">
            <div className="lp-card-icon">
              {/* Premium Intersecting Spark Logo — Sleek Senior Developer Look */}
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9L13 12L12 15L11 12L12 9Z"
                  fill="white"
                  opacity="0.9"
                />
              </svg>
            </div>
            <h2 className="lp-card-title">ActionMate AI</h2>
            <p className="lp-card-tagline">Don&apos;t just remind. Resolve.</p>
            <p className="lp-card-sub">
              Welcome back! Sign in to get your tasks<br/>scheduled and resolved with AI.
            </p>

            <div className="lp-divider">
              <div className="lp-divider-line" />
              <span className="lp-divider-txt">Continue with</span>
              <div className="lp-divider-line" />
            </div>

            {error && (
              <div>
                <div className="lp-error">{error}</div>
                {process.env.NODE_ENV !== "production" && (
                  <button onClick={handleSandboxBypass} type="button" className="lp-btn-sandbox" style={{marginBottom:'10px'}}>
                    🧪 Proceed in Demo Mode
                  </button>
                )}
              </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              <button
                id="btn-google-signin"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="lp-btn-google"
              >
                {loading ? (
                  <>
                    <svg className="lp-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Connecting to Google…
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>

              {process.env.NODE_ENV !== "production" && (
                <button
                  id="btn-sandbox-bypass"
                  onClick={handleSandboxBypass}
                  type="button"
                  className="lp-btn-sandbox"
                >
                  ✨ Bypass &amp; Enter Sandbox Mode
                </button>
              )}
            </div>

            <div className="lp-security">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Secured with Firebase Auth &amp; Google OAuth
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
