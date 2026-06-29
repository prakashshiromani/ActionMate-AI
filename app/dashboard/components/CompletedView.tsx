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

interface CompletedViewProps {
  tasks: MockTask[];
  setSelectedTask: (task: MockTask) => void;
}

export default function CompletedView({ tasks, setSelectedTask }: CompletedViewProps) {
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Completed Tasks</h2>
        <p className="text-xs text-text-muted mt-1">{completedTasks.length} tasks completed</p>
      </div>

      {completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <span className="text-5xl">🎯</span>
          <p className="text-text-muted text-sm">Koi completed task nahi hai abhi.</p>
          <p className="text-text-muted text-xs">Subtasks complete karo — task yahan aa jayegi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="p-4 rounded-xl border border-border bg-bg-surface hover:border-success/30 cursor-pointer transition-all duration-200 flex items-center gap-4"
            >
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="var(--success, #22c55e)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary line-clamp-1">{task.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {task.subtasksCount} subtasks · {task.deadlineText}
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  task.priority === "high"
                    ? "bg-error/10 text-error"
                    : task.priority === "medium"
                    ? "bg-warning/10 text-warning"
                    : "bg-text-muted/10 text-text-muted"
                }`}
              >
                {task.priority.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
