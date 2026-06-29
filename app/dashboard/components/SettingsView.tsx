"use client";

import React, { useState } from "react";

interface SettingsState {
  automationMode: "copilot" | "autopilot";
  responseStyle: "concise" | "detailed";
  proactiveNudges: boolean;
  workHours: {
    start: string;
    end: string;
    days: string[];
  };
  timezone: string;
  meetingDuration: number;
  taskPriority: "high" | "medium" | "low";
  googleCalendar: {
    connected: boolean;
    lastSync: string | null;
  };
  gmail: {
    connected: boolean;
    lastSync: string | null;
  };
  notifications: {
    inApp: boolean;
    email: boolean;
    quietHours: {
      start: string;
      end: string;
    };
    reminderFrequency: number;
  };
  syncPreferences: {
    calendar: number;
    gmail: number;
  };
}

interface SettingsViewProps {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
  handleResetToDefaults: () => void;
  isDark: boolean;
  isGoogleConnected: boolean;
  reAuthLoading: boolean;
  handleReAuthorize: () => void;
  handleConnectSilentSync: () => void;
  handleDisconnectSilentSync: () => void;
  showSaveSuccess: boolean;
  setActionsMap: React.Dispatch<React.SetStateAction<any>>;
  tasks: any[];
}

export default function SettingsView({
  settingsState,
  setSettingsState,
  handleResetToDefaults,
  isDark,
  isGoogleConnected,
  reAuthLoading,
  handleReAuthorize,
  handleConnectSilentSync,
  handleDisconnectSilentSync,
  showSaveSuccess,
  setActionsMap,
  tasks,
}: SettingsViewProps) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "ai" | "integrations" | "notifications">("general");

  const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
          <p className="text-text-muted text-sm mt-1">Configure your workspace preferences and integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToDefaults}
            className="bg-bg-surface hover:bg-error/10 hover:text-error hover:border-error/30 text-text-primary border border-border px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Sub-tabs selector */}
      <div className="flex border-b border-border/50 gap-4 mb-6" role="tablist" aria-label="Settings sections">
        {[
          { id: "general", label: "General" },
          { id: "ai", label: "AI Assistant" },
          { id: "integrations", label: "Integrations" },
          { id: "notifications", label: "Notifications" },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeSettingsTab === t.id}
            aria-controls={`settings-panel-${t.id}`}
            onClick={() => setActiveSettingsTab(t.id as any)}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-all relative ${
              activeSettingsTab === t.id
                ? "border-accent-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}

        {/* Auto-save success indicator */}
        {showSaveSuccess && (
          <span className="ml-auto text-xs text-success font-semibold flex items-center gap-1 animate-fade-in">
            <span>✓</span> {isGoogleConnected ? "Synced to cloud" : "Saved locally"}
          </span>
        )}
      </div>

      <div className="min-h-[400px]">
        {/* GENERAL TAB */}
        {activeSettingsTab === "general" && (
          <div id="settings-panel-general" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Office Working Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Start Time</span>
                  <div className="relative">
                    <input
                      type="time"
                      value={settingsState.workHours.start}
                      onChange={(e) =>
                        setSettingsState({
                          ...settingsState,
                          workHours: { ...settingsState.workHours, start: e.target.value },
                        })
                      }
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                      className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">End Time</span>
                  <div className="relative">
                    <input
                      type="time"
                      value={settingsState.workHours.end}
                      onChange={(e) =>
                        setSettingsState({
                          ...settingsState,
                          workHours: { ...settingsState.workHours, end: e.target.value },
                        })
                      }
                      style={{ colorScheme: isDark ? "dark" : "light" }}
                      className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>

              {/* Work days select */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold text-text-muted uppercase">Working Days</span>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((day) => {
                    const active = settingsState.workHours.days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const list = [...settingsState.workHours.days];
                          const idx = list.indexOf(day);
                          if (idx !== -1) list.splice(idx, 1);
                          else list.push(day);
                          setSettingsState({
                            ...settingsState,
                            workHours: { ...settingsState.workHours, days: list },
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          active
                            ? "bg-accent-primary/10 border-accent-primary text-accent-primary"
                            : "bg-bg-base border-border text-text-muted hover:text-text-primary"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Regional Config</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Timezone</span>
                  <select
                    value={settingsState.timezone}
                    onChange={(e) => setSettingsState({ ...settingsState, timezone: e.target.value })}
                    className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="America/New_York">Eastern Standard Time (EST - UTC-5)</option>
                    <option value="America/Los_Angeles">Pacific Standard Time (PST - UTC-8)</option>
                    <option value="Europe/London">Greenwich Mean Time (GMT - UTC+0)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Default Slot Duration</span>
                  <select
                    value={settingsState.meetingDuration}
                    onChange={(e) => setSettingsState({ ...settingsState, meetingDuration: Number(e.target.value) })}
                    className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI PREFERENCES TAB */}
        {activeSettingsTab === "ai" && (
          <div id="settings-panel-ai" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Agent Mode</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  {[
                    {
                      id: "copilot",
                      title: "Co-Pilot Mode",
                      desc: "AI recommends calendar events and email drafts, but you review and approve every action before execution.",
                    },
                    {
                      id: "autopilot",
                      title: "Autopilot Mode",
                      desc: "AI runs autonomously in the background, scheduling events and sending extensions without prompting you.",
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSettingsState({ ...settingsState, automationMode: mode.id as any })}
                      className={`flex-1 text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        settingsState.automationMode === mode.id
                          ? "border-accent-primary bg-accent-primary/5 shadow-sm"
                          : "border-border bg-bg-base hover:bg-bg-raised/40"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold block ${
                          settingsState.automationMode === mode.id ? "text-accent-primary" : "text-text-primary"
                        }`}
                      >
                        {mode.title}
                      </span>
                      <span className="text-[11px] text-text-muted mt-1.5 leading-relaxed block">{mode.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3 border border-border bg-bg-base rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-primary block">Proactive conflict resolution</span>
                    <span className="text-[10px] text-text-muted">Allow agent to check for schedule overlaps.</span>
                  </div>
                  <button
                    onClick={() =>
                      setSettingsState({ ...settingsState, proactiveNudges: !settingsState.proactiveNudges })
                    }
                    role="switch"
                    aria-checked={settingsState.proactiveNudges}
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      settingsState.proactiveNudges ? "bg-accent-primary justify-end" : "bg-border justify-start"
                    }`}
                  >
                    <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Response Settings</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Default Task Importance</span>
                  <select
                    value={settingsState.taskPriority}
                    onChange={(e) => setSettingsState({ ...settingsState, taskPriority: e.target.value as any })}
                    className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value="high">High Importance</option>
                    <option value="medium">Medium Importance</option>
                    <option value="low">Low Importance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">AI Output Style</span>
                  <select
                    value={settingsState.responseStyle}
                    onChange={(e) => setSettingsState({ ...settingsState, responseStyle: e.target.value as any })}
                    className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value="concise">Concise & Direct (Focus on action summaries)</option>
                    <option value="detailed">Conversational (Provides reasoning logs)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS TAB */}
        {activeSettingsTab === "integrations" && (
          <div id="settings-panel-integrations" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span className="text-xl">📅</span> Google Calendar Sync
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Connect your account to allow ActionMate to check availability and create deep work slots autonomously.
              </p>
              <div className="pt-2">
                {isGoogleConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded-xl text-xs">
                      <span>✓ Connected & Active</span>
                      <button
                        onClick={handleDisconnectSilentSync}
                        className="text-error bg-error/10 hover:bg-error/15 border border-error/20 px-2 py-1 rounded-lg font-bold text-[10px]"
                      >
                        Disconnect
                      </button>
                    </div>
                    {reAuthLoading ? (
                      <p className="text-xs text-text-muted italic animate-pulse">Refreshing access token...</p>
                    ) : (
                      <button
                        onClick={handleReAuthorize}
                        className="w-full bg-bg-base hover:bg-bg-raised text-text-primary border border-border py-2 rounded-xl text-xs font-semibold transition"
                      >
                        🔄 Re-Authorize Account Permissions
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleConnectSilentSync}
                    className="w-full bg-gradient-to-tr from-blue-600 to-violet-600 hover:brightness-110 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition"
                  >
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span className="text-xl">📧</span> Gmail API Integration
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Allow the agent to autonomously draft professional extension requests or schedule confirmations for your review.
              </p>
              <div className="pt-2">
                {isGoogleConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 text-green-400 font-bold rounded-xl text-xs">
                      <span>✓ Connected & Active</span>
                      <button
                        onClick={handleDisconnectSilentSync}
                        className="text-error bg-error/10 hover:bg-error/15 border border-error/20 px-2 py-1 rounded-lg font-bold text-[10px]"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectSilentSync}
                    className="w-full bg-gradient-to-tr from-blue-600 to-violet-600 hover:brightness-110 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition"
                  >
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeSettingsTab === "notifications" && (
          <div id="settings-panel-notifications" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* Channels toggling */}
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Communication Channels</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-border bg-bg-base rounded-xl">
                  <span className="text-xs font-bold text-text-primary">In-app notifications</span>
                  <button
                    onClick={() =>
                      setSettingsState({
                        ...settingsState,
                        notifications: { ...settingsState.notifications, inApp: !settingsState.notifications.inApp },
                      })
                    }
                    role="switch"
                    aria-checked={settingsState.notifications.inApp}
                    aria-label="Toggle In-app notifications"
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      settingsState.notifications.inApp ? "bg-accent-primary justify-end" : "bg-border justify-start"
                    }`}
                  >
                    <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 border border-border bg-bg-base rounded-xl">
                  <span className="text-xs font-bold text-text-primary">Email alerts</span>
                  <button
                    onClick={() =>
                      setSettingsState({
                        ...settingsState,
                        notifications: { ...settingsState.notifications, email: !settingsState.notifications.email },
                      })
                    }
                    role="switch"
                    aria-checked={settingsState.notifications.email}
                    aria-label="Toggle Email alerts"
                    className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      settingsState.notifications.email ? "bg-accent-primary justify-end" : "bg-border justify-start"
                    }`}
                  >
                    <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quiet Hours & Alerts */}
            <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
              <h3 className="text-lg font-bold text-text-primary">Quiet Hours & Reminders</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase">DND Start Time</span>
                    <div className="relative">
                      <input
                        type="time"
                        value={settingsState.notifications.quietHours.start}
                        onChange={(e) =>
                          setSettingsState({
                            ...settingsState,
                            notifications: {
                              ...settingsState.notifications,
                              quietHours: { ...settingsState.notifications.quietHours, start: e.target.value },
                            },
                          })
                        }
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                        className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase">DND End Time</span>
                    <div className="relative">
                      <input
                        type="time"
                        value={settingsState.notifications.quietHours.end}
                        onChange={(e) =>
                          setSettingsState({
                            ...settingsState,
                            notifications: {
                              ...settingsState.notifications,
                              quietHours: { ...settingsState.notifications.quietHours, end: e.target.value },
                            },
                          })
                        }
                        style={{ colorScheme: isDark ? "dark" : "light" }}
                        className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Reminder Frequency</span>
                  <select
                    value={settingsState.notifications.reminderFrequency}
                    onChange={(e) =>
                      setSettingsState({
                        ...settingsState,
                        notifications: {
                          ...settingsState.notifications,
                          reminderFrequency: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value={5}>5 Minutes Before</option>
                    <option value={15}>15 Minutes Before</option>
                    <option value={60}>1 Hour Before</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
