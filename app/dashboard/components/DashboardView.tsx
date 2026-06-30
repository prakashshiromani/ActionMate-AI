"use client";

import React, { useRef, useEffect } from "react";
import ConflictBanner from "@/components/ConflictBanner";
import { playConflictAlert } from "@/lib/sounds";
import { auth } from "@/lib/firebase";

interface MockTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "scheduled" | "completed";
  deadlineText: string;
  subtasksCount: number;
  completedSubtasksCount: number;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  actions?: any[];
}

interface DashboardViewProps {
  tasks: MockTask[];
  setSelectedTask: (task: MockTask) => void;
  setChatOpen: (open: boolean) => void;
  setInputText: (text: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeConflict: any;
  setActiveConflict: (conflict: any) => void;
  mounted: boolean;
}

export default function DashboardView({
  tasks,
  setSelectedTask,
  setChatOpen,
  setInputText,
  setMessages,
  activeConflict,
  setActiveConflict,
  mounted,
}: DashboardViewProps) {
  // Play conflict alert once when the static DBMS+Presentation conflict is first visible
  const conflictSoundFired = useRef(false);
  const staticConflictVisible =
    !activeConflict &&
    tasks.some((t) => t.title.toLowerCase().includes("dbms") && t.status !== "completed") &&
    tasks.some((t) =>
      (t.title.toLowerCase().includes("presentation") || t.title.toLowerCase().includes("client")) &&
      t.status !== "completed"
    );
  useEffect(() => {
    if (staticConflictVisible && !conflictSoundFired.current) {
      conflictSoundFired.current = true;
      playConflictAlert();
    }
  }, [staticConflictVisible]);

  // Build Mon–Sun columns for the current week
  const now = mounted ? new Date() : new Date(0);
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Helper to format status
  const formatStatus = (status: string) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper for dynamic greeting
  const getGreeting = () => {
    const fullName = auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "Aryan";
    const firstName = fullName.split(" ")[0];
    const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    if (!mounted) return `Hello, ${capitalizedName}!`;
    const hr = new Date().getHours();
    if (hr < 12) return `Good morning, ${capitalizedName}!`;
    if (hr < 17) return `Good afternoon, ${capitalizedName}!`;
    return `Good evening, ${capitalizedName}!`;
  };

  // Parse deadlineText into a Date (best-effort)
  const parseDeadline = (text: string): Date | null => {
    if (!text) return null;
    const lower = text.toLowerCase();
    const base = new Date(now);
    base.setHours(23, 59, 0, 0);

    if (lower.startsWith("today")) return base;
    if (lower.startsWith("yesterday")) {
      const d = new Date(base);
      d.setDate(d.getDate() - 1);
      return d;
    }
    if (lower.startsWith("tomorrow")) {
      const d = new Date(base);
      d.setDate(d.getDate() + 1);
      return d;
    }
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  };

  // Count non-completed tasks per weekday column
  const counts = weekDays.map((wd) => {
    const wd0 = new Date(wd);
    wd0.setHours(0, 0, 0, 0);
    const wd1 = new Date(wd);
    wd1.setHours(23, 59, 59, 999);
    return tasks.filter((t) => {
      if (t.status === "completed") return false;
      const d = parseDeadline(t.deadlineText);
      return d && d >= wd0 && d <= wd1;
    }).length;
  });

  const getLoad = (count: number) => {
    if (count === 0) return "free";
    if (count === 1) return "low";
    if (count <= 2) return "medium";
    return "high";
  };

  const todayIdx = (() => {
    const t = new Date(now);
    t.setHours(0, 0, 0, 0);
    return weekDays.findIndex((d) => d.getTime() === t.getTime());
  })();

  const highTasks = tasks.filter((t) => t.priority === "high" && t.status !== "completed");
  const mediumTasks = tasks.filter((t) => t.priority === "medium" && t.status !== "completed");
  const lowTasks = tasks.filter((t) => t.priority === "low" && t.status !== "completed");

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{getGreeting()}</h1>
          <p className="text-text-muted text-sm mt-1">Here&apos;s your focus for today. Ready to resolve your commitments.</p>
        </div>
        <button
          onClick={() => {
            setChatOpen(true);
            setInputText("");
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: "Sure! 📝 Tell me about the new task you'd like to create. Include details like the subject, deadline, or any specific requirements — I'll break it down and set it up for you.",
              },
            ]);
          }}
          className="bg-accent-primary hover:brightness-110 active:scale-95 transition-all text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg duration-200"
        >
          <span>+</span> Add Task
        </button>
      </div>

      {/* Conflict detected Alert Banner */}
      {activeConflict ? (
        <ConflictBanner
          key={activeConflict.details}
          message={activeConflict.message}
          details={activeConflict.details}
          onResolve={() => {
            setChatOpen(true);
            setInputText(activeConflict.actionPrompt);
            setActiveConflict(null);
          }}
        />
      ) : (
        tasks.some((t) => t.title.toLowerCase().includes("dbms") && t.status !== "completed") &&
        tasks.some(
          (t) =>
            (t.title.toLowerCase().includes("presentation") || t.title.toLowerCase().includes("client")) &&
            t.status !== "completed"
        ) && (
          <ConflictBanner
            message="Deadline conflict in 6 hrs"
            details="DBMS Assignment vs. Client Presentation at 5:00 PM."
            onResolve={() => {
              setChatOpen(true);
              setInputText("Resolve DBMS Assignment vs Client Presentation conflict");
            }}
          />
        )
      )}

      {/* Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* High Lane */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-error uppercase">
            <span className="h-2 w-2 rounded-full bg-error animate-pulse" /> High Priority
          </div>
          <div className="space-y-3">
            {highTasks.length > 0 ? (
              highTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="p-3.5 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between min-h-[8.5rem] h-auto pb-4 cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-text-primary leading-snug">{task.title}</h4>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          task.status === "scheduled"
                            ? "bg-success/10 text-success"
                            : task.status === "completed"
                            ? "bg-success/15 text-success border border-success/30"
                            : "bg-accent-ai/10 text-accent-ai"
                        }`}
                      >
                        {formatStatus(task.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1.5">📅 Due: {task.deadlineText}</p>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted">
                      <span>Progress</span>
                      <span>
                        {task.completedSubtasksCount}/{task.subtasksCount} subtasks
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-raised border border-border/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-primary"
                        style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 border border-dashed border-border/60 bg-bg-surface/30 rounded-xl text-center py-8">
                <p className="text-xs text-text-muted">No high priority tasks — you&apos;re on track! 🎯</p>
              </div>
            )}
          </div>
        </div>

        {/* Medium Lane */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-warning uppercase">
            <span className="h-2 w-2 rounded-full bg-warning" /> Medium Priority
          </div>
          <div className="space-y-3">
            {mediumTasks.length > 0 ? (
              mediumTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="p-3.5 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between min-h-[8.5rem] h-auto pb-4 cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-text-primary leading-snug">{task.title}</h4>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          task.status === "completed" ? "bg-success/15 text-success border border-success/30" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {formatStatus(task.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1.5">📅 Due: {task.deadlineText}</p>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted">
                      <span>Progress</span>
                      <span>
                        {task.completedSubtasksCount}/{task.subtasksCount} subtasks
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-raised border border-border/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 border border-dashed border-border/60 bg-bg-surface/30 rounded-xl text-center py-8">
                <p className="text-xs text-text-muted">No medium tasks — you&apos;re on track! 🎯</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Lane */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-text-muted uppercase">
            <span className="h-2 w-2 rounded-full bg-text-muted" /> Low Priority
          </div>
          <div className="space-y-3">
            {lowTasks.length > 0 ? (
              lowTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="p-3.5 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between min-h-[8.5rem] h-auto pb-4 cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-text-primary leading-snug">{task.title}</h4>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-warning/10 text-warning shrink-0">
                        {formatStatus(task.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1.5">📅 Due: {task.deadlineText}</p>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-text-muted">
                      <span>Progress</span>
                      <span>
                        {task.completedSubtasksCount}/{task.subtasksCount} subtasks
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-bg-raised border border-border/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning"
                        style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 border border-dashed border-border/60 bg-bg-surface/30 rounded-xl text-center py-8">
                <p className="text-xs text-text-muted">No low priority tasks — you&apos;re on track! 🎯</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Timeline widget */}
      <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Upcoming Timeline</h3>
          <span className="text-[11px] text-text-muted font-mono">
            {mounted ? `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {weekDays.map((wd, i) => {
            const count = counts[i];
            const load = getLoad(count);
            const isToday = i === todayIdx;
            const fullDateStr = wd.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
            return (
              <div
                key={i}
                className="flex flex-col items-center py-3 rounded-xl hover:bg-bg-raised/40 transition-colors duration-250 cursor-pointer"
                title={`${count} active task${count !== 1 ? "s" : ""} on ${fullDateStr}`}
                style={
                  isToday
                    ? { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }
                    : {}
                }
              >
                <span className={`text-xs font-bold ${isToday ? "text-accent-primary" : "text-text-muted"}`}>
                  {DAY_LABELS[i]}
                </span>
                {isToday && <span className="text-[11px] text-accent-primary font-bold mt-0.5">Today</span>}
                <div className="h-10 flex items-center justify-center mt-1">
                  {load === "free" && <span className="h-1.5 w-1.5 rounded-full bg-border" />}
                  {load === "low" && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                  {load === "medium" && (
                    <div className="flex gap-0.5">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      <span className="h-2 w-2 rounded-full bg-warning" />
                    </div>
                  )}
                  {load === "high" && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-error" />
                        <span className="h-1.5 w-1.5 rounded-full bg-error" />
                      </div>
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-error" />
                        <span className="h-1.5 w-1.5 rounded-full bg-error" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-text-muted mt-1 font-medium">
                  {count} task{count !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Color Dot Legend */}
        <div className="flex justify-center flex-wrap gap-6 pt-3 border-t border-border/30 text-[10px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-border" /> Free / None
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> Low Load (1 task)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> Medium Load (2 tasks)
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-error" /> High Load (3+ tasks)
          </div>
        </div>
      </div>
    </>
  );
}
