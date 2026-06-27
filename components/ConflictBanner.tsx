"use client";

import { useEffect, useState } from "react";

interface ConflictBannerProps {
  message: string;
  details: string;
  onResolve: () => void;
}

export default function ConflictBanner({ message, details, onResolve }: ConflictBannerProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss banner after 8 seconds of no interaction to prevent visual fatigue
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative rounded-xl border border-warning/30 bg-warning/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-down shadow-md">
      <div className="flex items-start sm:items-center gap-3">
        <span className="text-xl animate-pulse">⚠️</span>
        <div>
          <p className="font-semibold text-warning text-sm">{message}</p>
          <p className="text-xs text-text-muted mt-0.5">{details}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 self-end sm:self-auto">
        <button
          onClick={() => {
            onResolve();
            setVisible(false);
          }}
          className="text-xs font-bold text-warning border border-warning/30 px-3 py-1.5 rounded-lg hover:bg-warning/10 transition-colors"
        >
          See AI Suggestion
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-text-muted hover:text-text-primary text-xs p-1"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
