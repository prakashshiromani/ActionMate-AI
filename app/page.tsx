import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-primary font-sans">
      
      {/* Hero Section */}
      <header className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-4xl mx-auto space-y-8">
        
        {/* Animated Icon badge */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-accent-primary to-accent-ai text-4xl shadow-xl animate-bounce">
          🤖
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-text-primary to-accent-ai bg-clip-text text-transparent">
            ActionMate AI
          </h1>
          <p className="text-xl md:text-2xl font-medium text-accent-ai italic">
            Don't just remind. Resolve.
          </p>
        </div>

        <p className="max-w-2xl text-base md:text-lg text-text-muted leading-relaxed">
          Productivity tools today are passive. They notify you, but when deadlines are tomorrow and your calendar is full, reminders won't write your presentation or request extensions. ActionMate AI closes that gap — it actively helps you execute.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Link
            href="/login"
            className="flex-1 bg-accent-primary hover:brightness-110 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-200 text-center"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="flex-1 bg-transparent hover:bg-bg-raised border border-border text-text-primary font-bold py-4 px-8 rounded-xl transition-all duration-200 text-center"
          >
            Learn More
          </a>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-bg-surface border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The Core Insight</h2>
            <p className="text-text-muted max-w-lg mx-auto text-sm">ActionMate eliminates the overhead of execution. Here is how:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "💬",
                title: "Zero-Friction Input",
                desc: "Type or speak in Hinglish. No forms or strict structures. Our AI extracts task name, deadline, and urgency automatically.",
              },
              {
                icon: "📅",
                title: "Calendar Blocking",
                desc: "Checks your Google Calendar availability autonomously and schedules focused deep work slots for each subtask.",
              },
              {
                icon: "📧",
                title: "Context-Aware Gmails",
                desc: "Detects scheduling conflicts and automatically drafts professional extension requests or confirmations for your review.",
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border bg-bg-base hover:border-accent-primary/20 transition-all duration-200 space-y-4">
                <span className="text-4xl">{feature.icon}</span>
                <h3 className="font-bold text-lg text-text-primary">{feature.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-text-muted border-t border-border/20 bg-bg-base">
        ActionMate AI &copy; 2026 · Vibe2Ship Submission
      </footer>
    </div>
  );
}
