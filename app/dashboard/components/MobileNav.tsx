"use client";

import React from "react";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedTask: (task: any) => void;
  isDark: boolean;
}

export default function MobileNav({
  activeTab,
  setActiveTab,
  setSelectedTask,
  isDark,
}: MobileNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20"
      style={{
        background: isDark ? "rgba(15,23,42,0.95)" : "rgba(248,250,252,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark ? "0 -8px 32px rgba(0,0,0,0.4)" : "0 -8px 32px rgba(0,0,0,0.08)",
      }}
    >
      {/* Active route title strip */}
      <div className="flex items-center justify-center h-6 border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/70">
          {activeTab === "dashboard" ? "Dashboard" : activeTab === "tasks" ? "Tasks" : activeTab === "calendar" ? "Calendar" : activeTab === "completed" ? "Completed" : activeTab === "logs" ? "Logs" : "Settings"}
        </span>
      </div>
      <div className="flex justify-around items-center h-16 px-2">
        {[
          {
            id: "dashboard",
            label: "Home",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9" />
              </svg>
            ),
          },
          {
            id: "tasks",
            label: "Tasks",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            id: "calendar",
            label: "Calendar",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                <circle cx="7" cy="14" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
                <circle cx="17" cy="14" r="1" fill="currentColor" />
                <circle cx="7" cy="18" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
                <circle cx="17" cy="18" r="1" fill="currentColor" />
              </svg>
            ),
          },
          {
            id: "completed",
            label: "Completed",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            id: "logs",
            label: "Logs",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            id: "settings",
            label: "Settings",
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
              </svg>
            ),
          },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedTask(null);
              }}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200"
              style={{ color: isActive ? "#93c5fd" : "#475569" }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ background: "linear-gradient(90deg, #3B82F6, #8B5CF6)" }}
                />
              )}
              <span style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(147,197,253,0.6))" : "none" }}>
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
