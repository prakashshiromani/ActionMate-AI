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

interface LogsViewProps {
  actionsMap: Record<string, any[]>;
  tasks: MockTask[];
}

export default function LogsView({ actionsMap, tasks }: LogsViewProps) {
  const allActions = Object.entries(actionsMap).flatMap(([taskId, list]) => {
    const task = tasks.find((t) => t.id === taskId);
    return list.map((act) => ({
      ...act,
      taskTitle: task?.title || "System Process",
    }));
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Agent Activity Logs</h1>
        <p className="text-text-muted text-sm mt-1">
          Audit trail of all autonomous checks, calendar blocks, and drafts.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        {allActions.length === 0 ? (
          <p className="text-sm text-text-muted italic text-center py-8">No activity logs recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-6 border-l-2 border-accent-primary/30 ml-3">
            {allActions.map((action, i) => {
              const isCompleted = action.status === "executed" || action.status === "approved";
              const isFailed = action.status === "failed";
              let statusColor = "bg-warning";
              let statusText = "Pending Approval";
              if (isCompleted) {
                statusColor = "bg-success";
                statusText = "Executed";
              } else if (isFailed) {
                statusColor = "bg-error";
                statusText = "Failed";
              }

              let icon = "⚙️";
              if (action.actionType === "CALENDAR_BLOCK") icon = "📅";
              if (action.actionType === "GMAIL_DRAFT") icon = "📧";
              if (action.actionType === "CONFLICT_DETECTED") icon = "⚠️";

              return (
                <div key={i} className="relative group font-mono text-xs">
                  <span
                    className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-surface ${statusColor} shadow-sm`}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-[10px]">
                        {action.executedAt ? new Date(action.executedAt).toLocaleTimeString() : "Pending"}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isCompleted ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <p className="text-text-primary text-sm font-semibold flex items-center gap-2">
                      <span>{icon}</span> {action.detail}
                    </p>
                    <p className="text-[10px] text-text-muted italic">Task context: {action.taskTitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
