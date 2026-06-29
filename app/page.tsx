import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-primary font-sans overflow-x-hidden">

      {/* Hero Section */}
      <header className="relative flex flex-col items-center justify-center text-center px-4 pt-28 pb-20 max-w-5xl mx-auto w-full space-y-8">
        {/* Ambient glow blobs */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(ellipse, #3B82F6 0%, #8B5CF6 50%, transparent 80%)" }}
          aria-hidden="true"
        />

        {/* Animated Robot Badge */}
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 0 60px rgba(139,92,246,0.5), 0 20px 40px rgba(59,130,246,0.3)" }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="8" width="18" height="13" rx="3" fill="white" fillOpacity="0.95"/>
            <path d="M9 8V6a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="14" r="1.8" fill="#3B82F6"/>
            <circle cx="15" cy="14" r="1.8" fill="#8B5CF6"/>
            <path d="M9 18h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-[28px] border border-purple-500/30 animate-ping opacity-40" aria-hidden="true" />
        </div>

        <div className="space-y-4 relative">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none">
            <span style={{
              background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #93c5fd 70%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              ActionMate AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-semibold" style={{ color: "#93c5fd" }}>
            Don&apos;t just remind.&nbsp;<span style={{ color: "#a78bfa" }}>Resolve.</span>
          </p>
        </div>

        <p className="max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Productivity tools today are passive — they notify you. But when deadlines are tomorrow and your calendar is full, reminders won&apos;t write your presentation or request an extension.
          <br /><br />
          <strong style={{ color: "var(--text-primary)" }}>ActionMate closes that gap.</strong> It detects conflicts, blocks calendar slots, and drafts emails — autonomously.
        </p>

        {/* Trust Strip */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {[
            { label: "Gemini 2.0 Flash", color: "#4285F4" },
            { label: "Google Calendar", color: "#34A853" },
            { label: "Gmail API", color: "#EA4335" },
            { label: "Firebase", color: "#FBBC05" },
            { label: "Next.js 15", color: "#6366f1" },
          ].map((tech) => (
            <span
              key={tech.label}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border"
              style={{
                borderColor: `${tech.color}40`,
                background: `${tech.color}10`,
                color: tech.color,
              }}
            >
              {tech.label}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md pt-2">
          <Link
            href="/login"
            className="flex-1 text-white font-bold py-4 px-8 rounded-xl shadow-lg text-center transition-all duration-200 active:scale-95"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 4px 20px rgba(139,92,246,0.4)" }}
          >
            Get Started Free →
          </Link>
          <a
            href="#how-it-works"
            className="flex-1 font-bold py-4 px-8 rounded-xl transition-all duration-200 text-center active:scale-95"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            See How It Works
          </a>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 pt-4">
          {[
            { value: "10x", label: "Faster Task Resolution" },
            { value: "3", label: "Google APIs Integrated" },
            { value: "100%", label: "Autonomous Execution" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold" style={{ color: "var(--accent-primary)" }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>How It Works</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Three Steps. Zero Friction.</h2>
            <p className="max-w-lg mx-auto text-sm" style={{ color: "var(--text-muted)" }}>
              From a natural language prompt to a fully scheduled action — in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line — desktop only */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px"
              style={{ background: "linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)", opacity: 0.3 }}
              aria-hidden="true"
            />
            {[
              {
                step: "01",
                title: "You Speak or Type",
                desc: "Tell ActionMate what's coming up — in plain English or Hinglish. No forms, no structure needed.",
                color: "#3B82F6",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                ),
              },
              {
                step: "02",
                title: "AI Detects & Plans",
                desc: "Gemini AI scans your calendar, identifies conflicts, and creates a full action plan with subtasks and email drafts.",
                color: "#8B5CF6",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                  </svg>
                ),
              },
              {
                step: "03",
                title: "One Tap to Execute",
                desc: "Approve the suggestions — or let Autopilot handle it. Calendar is blocked, email is drafted, task is tracked.",
                color: "#10B981",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border space-y-4 transition-all duration-200"
                style={{ background: "var(--bg-base)", borderColor: "var(--border)" }}
              >
                {/* Step number */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white flex-shrink-0"
                    style={{ background: item.color, boxShadow: `0 4px 12px ${item.color}40` }}
                  >
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold opacity-40 font-mono" style={{ color: item.color }}>STEP {item.step}</span>
                </div>
                <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>Core Features</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Built to Execute, Not Just Remind</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                gradient: "linear-gradient(135deg, #3B82F6, #2563EB)",
                title: "Zero-Friction Input",
                desc: "Type or speak in Hinglish. No forms. AI extracts task name, deadline, and urgency automatically from natural language.",
                icon: "💬",
              },
              {
                gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
                title: "Smart Calendar Blocking",
                desc: "Checks your Google Calendar availability and schedules focused deep-work slots — autonomously, without you touching the calendar.",
                icon: "📅",
              },
              {
                gradient: "linear-gradient(135deg, #10B981, #059669)",
                title: "Context-Aware Emails",
                desc: "Detects conflicts and auto-drafts professional extension requests or confirmations in Gmail for your one-tap approval.",
                icon: "📧",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border space-y-4 transition-all duration-200 hover:scale-[1.02] group"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-lg"
                  style={{ background: feature.gradient }}
                >
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 text-center border-t" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Ready to Stop Reminding and Start Resolving?</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Join the future of productivity. Sign in with Google and let ActionMate handle the execution.
          </p>
          <Link
            href="/login"
            className="inline-block text-white font-bold py-4 px-10 rounded-xl transition-all duration-200 active:scale-95"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 4px 24px rgba(139,92,246,0.4)" }}
          >
            Start Free with Google →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t" style={{ borderColor: "var(--border)", background: "var(--bg-base)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          ActionMate AI &copy; 2026 &nbsp;·&nbsp; Built with Gemini AI, Firebase &amp; Next.js &nbsp;·&nbsp; Vibe2Ship Submission
        </p>
      </footer>
    </div>
  );
}
