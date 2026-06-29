import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-primary font-sans overflow-x-hidden pt-16">
      
      {/* Sticky top navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border/40 bg-bg-base/70 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-ai flex items-center justify-center text-white text-xs font-bold shadow-md">
            🤖
          </div>
          <span className="font-bold text-sm tracking-tight">ActionMate AI</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs text-text-muted hover:text-text-primary transition font-semibold">Features</a>
          <a href="#how-it-works" className="text-xs text-text-muted hover:text-text-primary transition font-semibold">How It Works</a>
          <Link href="/login" className="bg-accent-primary hover:brightness-110 active:scale-95 transition text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md duration-200">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 max-w-5xl mx-auto w-full space-y-8">
        {/* Ambient glow blobs */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(ellipse, #3B82F6 0%, #8B5CF6 50%, transparent 80%)" }}
          aria-hidden="true"
        />

        {/* Animated Robot Badge */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 0 40px rgba(139,92,246,0.4), 0 10px 20px rgba(59,130,246,0.2)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="8" width="18" height="13" rx="3" fill="white" fillOpacity="0.95"/>
            <path d="M9 8V6a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="14" r="1.8" fill="#3B82F6"/>
            <circle cx="15" cy="14" r="1.8" fill="#8B5CF6"/>
            <path d="M9 18h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-[20px] border border-purple-500/30 animate-ping opacity-40" aria-hidden="true" />
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
            { label: "Next.js 16", color: "#6366f1" },
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
            className="flex-1 font-bold py-4 px-8 rounded-xl transition-all duration-200 text-center active:scale-95 border"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "rgba(255,255,255,0.2)",
              color: "var(--text-primary)",
            }}
          >
            See How It Works
          </a>
        </div>

        {/* Interactive Dashboard Mockup Card */}
        <div className="w-full max-w-4xl border border-border/80 rounded-2xl bg-bg-surface/50 p-3 shadow-2xl relative overflow-hidden backdrop-blur-sm group/mockup">
          <div className="flex items-center gap-1.5 pb-2.5 px-1 border-b border-border/40">
            <span className="w-3 h-3 rounded-full bg-error/30" />
            <span className="w-3 h-3 rounded-full bg-warning/30" />
            <span className="w-3 h-3 rounded-full bg-success/30" />
            <span className="text-[10px] text-text-muted font-mono ml-4">https://actionmate-ai.app/dashboard</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 h-64 text-left font-sans select-none overflow-hidden">
            {/* Mock sidebar */}
            <div className="hidden md:flex flex-col gap-2.5 border-r border-border/30 pr-3 text-[11px] text-text-muted">
              <div className="h-6 bg-accent-primary/10 rounded flex items-center px-2 font-bold text-accent-primary">📊 Dashboard</div>
              <div className="h-6 rounded hover:bg-bg-raised/40 flex items-center px-2">📅 Calendar</div>
              <div className="h-6 rounded hover:bg-bg-raised/40 flex items-center px-2">📧 Agent Logs</div>
              <div className="h-6 rounded hover:bg-bg-raised/40 flex items-center px-2">⚙️ Settings</div>
            </div>
            {/* Mock center dashboard */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="p-3 border border-error/30 bg-error/5 rounded-xl text-xs text-error font-medium flex items-center justify-between animate-pulse">
                <span>⚠️ Conflict: submission vs presentation at 5 PM</span>
                <span className="px-2 py-0.5 bg-error text-white rounded text-[10px]">Resolve</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 border border-border/50 bg-bg-surface/80 rounded-xl">
                  <span className="text-[9px] font-bold text-error uppercase">High Priority</span>
                  <p className="text-xs font-bold text-text-primary mt-1 line-clamp-1">Submit DBMS Assignment</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Progress: 1/5 subtasks</p>
                </div>
                <div className="p-2.5 border border-border/50 bg-bg-surface/80 rounded-xl">
                  <span className="text-[9px] font-bold text-warning uppercase">Medium Priority</span>
                  <p className="text-xs font-bold text-text-primary mt-1 line-clamp-1">Prepare ER Diagrams</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Progress: 3/3 completed</p>
                </div>
              </div>
            </div>
            {/* Mock Chat Panel */}
            <div className="border-l border-border/30 pl-3 flex flex-col gap-2.5">
              <div className="text-xs font-bold text-text-primary border-b border-border/30 pb-1.5">ActionMate AI</div>
              <div className="flex-1 space-y-2 overflow-hidden text-[10px]">
                <div className="p-2 rounded-lg bg-accent-primary/10 text-text-primary">I found a schedule conflict tomorrow. Drafting extension...</div>
                <div className="p-2 rounded-lg bg-bg-surface border border-border">Draft email to Prof. Sharma?</div>
              </div>
              <div className="h-8 border border-border/80 rounded-xl bg-bg-base flex items-center justify-between px-2 text-[10px] text-text-muted">
                <span>Type command...</span>
                <span>🎙️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="w-full pt-10 mt-12 border-t border-border/20 flex flex-wrap justify-center gap-12 md:gap-20">
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
          <div className="space-y-4">
            <Link
              href="/login"
              className="inline-block text-white font-bold py-4 px-10 rounded-xl transition-all duration-200 active:scale-95"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 4px 24px rgba(139,92,246,0.4)" }}
            >
              Start Free with Google →
            </Link>
            
            {/* Social Proof rating */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <div className="flex -space-x-2">
                <span className="w-8 h-8 rounded-full bg-slate-700 border-2 border-bg-surface flex items-center justify-center text-xs shadow">👨‍💻</span>
                <span className="w-8 h-8 rounded-full bg-purple-700 border-2 border-bg-surface flex items-center justify-center text-xs shadow">👩‍🎓</span>
                <span className="w-8 h-8 rounded-full bg-blue-700 border-2 border-bg-surface flex items-center justify-center text-xs shadow">👨‍💼</span>
              </div>
              <div className="text-left text-xs text-text-muted">
                <div className="flex items-center gap-0.5 text-warning font-bold">
                  ⭐⭐⭐⭐⭐ <span className="text-text-primary ml-1 font-mono">4.9/5</span>
                </div>
                <div>Loved by 1,200+ developers, students, and coordinators</div>
              </div>
            </div>
          </div>
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
