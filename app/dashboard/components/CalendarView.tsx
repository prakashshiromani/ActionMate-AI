"use client";

import React from "react";

interface MockTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "scheduled" | "completed";
  deadlineText: string;
  subtasksCount: number;
  completedSubtasksCount: number;
}

interface CalendarViewProps {
  tasks: MockTask[];
  setSelectedTask: (task: MockTask) => void;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  selectedCalendarDate: Date | null;
  setSelectedCalendarDate: (date: Date | null) => void;
}

export default function CalendarView({
  tasks,
  setSelectedTask,
  calendarDate,
  setCalendarDate,
  selectedCalendarDate,
  setSelectedCalendarDate,
}: CalendarViewProps) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // start on Monday
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = offset - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevTotalDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    cells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month padding to standard 42 cell grid
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to format status
  const formatStatus = (status: string) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper to parse deadline
  const parseDeadline = (text: string): Date | null => {
    if (!text) return null;
    const lower = text.toLowerCase();
    const base = new Date();
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

  const getTasksForDate = (date: Date) => {
    const d0 = new Date(date);
    d0.setHours(0, 0, 0, 0);
    const d1 = new Date(date);
    d1.setHours(23, 59, 59, 999);
    return tasks.filter((t) => {
      if (t.status === "completed") return false;
      const deadlineDate = parseDeadline(t.deadlineText);
      return deadlineDate && deadlineDate >= d0 && deadlineDate <= d1;
    });
  };

  const selectedDayTasks = selectedCalendarDate ? getTasksForDate(selectedCalendarDate) : [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Calendar</h1>
          <p className="text-text-muted text-sm mt-1">View your monthly commitments and deadlines.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCalendarDate(new Date())}
            className="bg-bg-surface hover:bg-bg-raised text-text-primary border border-border px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            Today
          </button>
          <div className="flex items-center bg-bg-surface border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              className="px-3 py-1.5 hover:bg-bg-raised text-text-primary text-xs font-bold transition border-r border-border"
            >
              ←
            </button>
            <span className="px-4 py-1.5 text-xs font-bold text-text-primary min-w-[120px] text-center">
              {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              className="px-3 py-1.5 hover:bg-bg-raised text-text-primary text-xs font-bold transition border-l border-border"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid wrapper */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((day, idx) => (
              <span key={idx} className="text-xs font-bold text-text-muted text-center py-2">
                {day}
              </span>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 gap-2">
            {cells.map((cell, idx) => {
              const dateTasks = getTasksForDate(cell.date);
              const cellTime = new Date(cell.date);
              cellTime.setHours(0, 0, 0, 0);
              const isToday = cellTime.getTime() === today.getTime();
              const isSelected =
                selectedCalendarDate &&
                cellTime.getTime() === new Date(selectedCalendarDate).setHours(0, 0, 0, 0);

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedCalendarDate(cell.date)}
                  className={`aspect-square p-2 rounded-xl flex flex-col justify-between cursor-pointer transition border hover:bg-bg-raised/50 ${
                    isSelected
                      ? "border-accent-primary bg-accent-primary/5 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                      : isToday
                      ? "border-accent-primary/30 bg-accent-primary/5"
                      : "border-border/40"
                  } ${cell.isCurrentMonth ? "text-text-primary" : "text-text-muted opacity-40"}`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? "text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded-md" : ""
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {dateTasks.length > 0 && (
                      <span className="text-[9px] px-1 bg-border/50 rounded text-text-muted font-mono font-bold">
                        {dateTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Task Priority Indicator dots */}
                  {dateTasks.length > 0 && (
                    <div className="flex gap-1 flex-wrap overflow-hidden h-4 items-center">
                      {dateTasks.slice(0, 3).map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className={`h-1.5 w-1.5 rounded-full ${
                            t.priority === "high" ? "bg-error" : t.priority === "medium" ? "bg-warning" : "bg-text-muted"
                          }`}
                          title={t.title}
                        />
                      ))}
                      {dateTasks.length > 3 && (
                        <span className="text-[7px] text-text-muted font-bold font-mono">
                          +{dateTasks.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4 h-fit flex flex-col">
          <div className="border-b border-border/50 pb-3">
            <h3 className="font-bold text-base">Day Details</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {selectedCalendarDate
                ? selectedCalendarDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                : "Select a date to view tasks"}
            </p>
          </div>

          {selectedCalendarDate ? (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px]">
              {selectedDayTasks.length === 0 ? (
                <div className="text-center py-10 space-y-2 select-none">
                  <span className="text-3xl block">🎉</span>
                  <p className="text-xs font-bold text-text-primary">No tasks scheduled</p>
                  <p className="text-[10px] text-text-muted">You have a clear calendar for this date! Enjoy your day.</p>
                </div>
              ) : (
                selectedDayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 rounded-xl border border-border/60 bg-bg-base hover:bg-bg-raised cursor-pointer transition flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs line-clamp-2 text-text-primary leading-snug">{t.title}</h4>
                      <div className="flex gap-1 pt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                            t.priority === "high"
                              ? "bg-error/10 text-error"
                              : t.priority === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-text-muted/10 text-text-muted"
                          }`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-accent-ai/10 text-accent-ai">
                          {formatStatus(t.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-text-muted pt-1 border-t border-border/10">
                      <span>
                        Progress: {t.completedSubtasksCount}/{t.subtasksCount}
                      </span>
                      <span className="font-semibold text-accent-primary">Open →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted select-none">
              <span className="text-2xl mb-2">📅</span>
              <p className="text-[11px] font-bold text-text-primary">No Date Selected</p>
              <p className="text-[10px] text-text-muted mt-1">Click on any date in the calendar grid to see scheduled tasks and details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
