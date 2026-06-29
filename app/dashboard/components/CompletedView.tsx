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
        <h2 className="text-3xl font-extrabold tracking-tight">Completed Tasks</h2>
        <p className="text-sm text-text-muted mt-1">{completedTasks.length} tasks completed successfully</p>
      </div>

      {completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 select-none">
          <span className="text-5xl">🎯</span>
          <div>
            <p className="text-sm font-bold text-text-primary">No completed tasks yet</p>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              Finish all the subtasks on your active tasks list to automatically mark them as completed!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {completedTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="p-4 rounded-xl border border-border bg-bg-surface hover:border-success/30 cursor-pointer transition-all duration-200 flex items-center gap-4 shadow-sm"
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
                  {task.subtasksCount} subtasks &bull; {task.deadlineText}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 uppercase ${
                  task.priority === "high"
                    ? "bg-error/10 text-error"
                    : task.priority === "medium"
                    ? "bg-warning/10 text-warning"
                    : "bg-text-muted/10 text-text-muted"
                }`}
              >
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
