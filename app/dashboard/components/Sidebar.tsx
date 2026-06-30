"use client";

import React from "react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTask: any;
  setSelectedTask: (task: any) => void;
  isDark: boolean;
  toggleTheme: () => void;
  auth: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedTask,
  setSelectedTask,
  isDark,
  toggleTheme,
  auth,
}: SidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col justify-between py-5 w-14 hover:w-56 flex-shrink-0 overflow-hidden border-r transition-all duration-300 ease-in-out group z-20"
      style={{
        background: isDark
          ? "linear-gradient(180deg, #0f172a 0%, #131e35 60%, #0f172a 100%)"
          : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)",
        backdropFilter: "blur(20px)",
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
        boxShadow: isDark
          ? "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.35)"
          : "inset -1px 0 0 rgba(0,0,0,0.05), 4px 0 24px rgba(0,0,0,0.06)",
      }}
    >
      {/* TOP: Logo + Nav */}
      <div className="flex flex-col gap-7 w-full">
        {/* Logo Mark */}
        <div className="px-2 group-hover:px-4 flex items-center justify-center group-hover:justify-start gap-3 w-full">
          <div
            className="relative flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-2xl text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              boxShadow: "0 0 20px rgba(139,92,246,0.4)",
            }}
          >
            {/* Premium Intersecting Spark Logo — Sleek Senior Developer Look */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer spark / diamond */}
              <path
                d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner accent dot/spark */}
              <path
                d="M12 9L13 12L12 15L11 12L12 9Z"
                fill="white"
                opacity="0.9"
              />
            </svg>
            {/* Pulsing dot */}
            <span
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 animate-pulse"
              style={{ borderColor: "var(--bg-base)" }}
            />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
            <p className="text-sm font-bold text-text-primary whitespace-nowrap leading-tight">ActionMate</p>
            <p className="text-[11px] text-blue-400 whitespace-nowrap">AI Productivity</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: "var(--border)", opacity: 0.3 }} />

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 w-full px-2 group-hover:px-3">
          {[
            {
              id: "dashboard",
              label: "Dashboard",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              id: "calendar",
              label: "Calendar",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
            },
            {
              id: "logs",
              label: "Logs",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              id: "settings",
              label: "Settings",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" />
                </svg>
              ),
            },
          ].map((item) => {
            const isActive = activeTab === item.id && !selectedTask;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedTask(null);
                }}
                role="tab"
                aria-selected={isActive}
                aria-label={item.label}
                className="relative flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3.5 w-full text-left rounded-xl transition-all duration-200 group/btn px-2.5 group-hover:px-3 py-2.5"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 100%)"
                    : "transparent",
                  boxShadow: isActive
                    ? "inset 0 0 0 1px rgba(139,92,246,0.2), 0 4px 12px rgba(59,130,246,0.05)"
                    : "none",
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {/* Active left bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: "linear-gradient(180deg, #3B82F6, #8B5CF6)" }}
                  />
                )}
                {/* Icon */}
                <span
                  className="flex-shrink-0 transition-all duration-200"
                  style={{
                    color: isActive ? "var(--accent-primary)" : "inherit",
                    filter: isActive ? "drop-shadow(0 0 4px rgba(139,92,246,0.4))" : "none",
                  }}
                >
                  {item.icon}
                </span>
                {/* Label */}
                <span
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold text-sm whitespace-nowrap overflow-hidden w-0 group-hover:w-auto"
                  style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM: Theme Toggle + User Profile */}
      <div className="px-2 group-hover:px-3 flex flex-col gap-2">
        {/* Divider */}
        <div className="mb-1 h-px" style={{ background: "var(--border)", opacity: 0.3 }} />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="relative flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3.5 w-full text-left rounded-xl transition-all duration-200 px-2.5 group-hover:px-3 py-2.5"
          style={{
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)")
          }
        >
          {/* Icon: Moon or Sun */}
          <span className="flex-shrink-0" style={{ color: isDark ? "#93c5fd" : "#F59E0B" }}>
            {isDark ? (
              /* Moon icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            ) : (
              /* Sun icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>

          {/* Label - only visible when sidebar expanded */}
          <span
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold text-sm whitespace-nowrap w-0 overflow-hidden group-hover:w-auto group-hover:flex-1"
            style={{ color: "var(--text-muted)" }}
          >
            {isDark ? "Dark Mode" : "Light Mode"}
          </span>

          {/* Pill Toggle */}
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 w-0 overflow-hidden group-hover:w-auto">
            <span
              className="flex items-center rounded-full p-0.5 transition-all duration-300"
              style={{
                width: "32px",
                height: "18px",
                background: isDark ? "rgba(59,130,246,0.4)" : "rgba(245,158,11,0.4)",
                border: `1px solid ${isDark ? "rgba(59,130,246,0.5)" : "rgba(245,158,11,0.5)"}`,
                justifyContent: isDark ? "flex-end" : "flex-start",
              }}
            >
              <span
                className="rounded-full shadow-sm"
                style={{
                  width: "12px",
                  height: "12px",
                  background: isDark ? "#93c5fd" : "#F59E0B",
                }}
              />
            </span>
          </span>
        </button>

        {/* User Profile */}
        <div
          className="flex items-center justify-between group-hover:justify-start gap-0 group-hover:gap-3 w-full rounded-xl p-1 group-hover:p-2 cursor-pointer transition-all duration-200 mb-2"
          style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)")
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shadow-md"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                  boxShadow: "0 0 0 2px rgba(139,92,246,0.35), 0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                {(auth?.currentUser?.displayName || auth?.currentUser?.email || "Aryan Mehta")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              {/* Online dot */}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 0 2px var(--bg-base)" }}
              />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-0 w-0 overflow-hidden group-hover:w-auto">
              <p
                className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: "var(--text-primary)", maxWidth: "100px" }}
              >
                {auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "Aryan Mehta"}
              </p>
              <p className="text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                Pro Plan · Active
              </p>
            </div>
          </div>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (confirm("Are you sure you want to sign out of ActionMate?")) {
                try {
                  if (auth) {
                    const { signOut } = await import("firebase/auth");
                    await signOut(auth);
                  }
                } catch (err) {
                  console.error("Firebase sign out failed:", err);
                }

                try {
                  await fetch("/api/auth/session", { method: "DELETE" });
                } catch (err) {
                  console.error("Session deletion failed:", err);
                }

                sessionStorage.clear();
                localStorage.removeItem("sandboxTasks");
                localStorage.removeItem("sandboxSubtasks");
                localStorage.removeItem("sandboxActions");
                localStorage.removeItem("sandboxSettings");
                document.cookie = "actionmate_auth=; path=/; max-age=0";
                window.location.href = "/login";
              }
            }}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-error/10 text-text-muted hover:text-error rounded-lg transition-colors ml-auto hidden group-hover:block shrink-0"
            title="Sign Out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
