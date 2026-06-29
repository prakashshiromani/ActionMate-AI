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

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  actions?: any[];
}

interface TasksViewProps {
  tasks: MockTask[];
  setSelectedTask: (task: MockTask) => void;
  setChatOpen: (open: boolean) => void;
  setInputText: (text: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export default function TasksView({
  tasks,
  setSelectedTask,
  setChatOpen,
  setInputText,
  setMessages,
}: TasksViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your Tasks</h1>
          <p className="text-text-muted text-sm mt-1">Manage and track your custom subtask breakdowns.</p>
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
          <span>+</span> New Task
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
        <div className="divide-y divide-border/50">
          {tasks.length === 0 ? (
            <p className="text-sm text-text-muted italic text-center py-6">
              No tasks available. Use the assistant on the right to create one.
            </p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-bg-raised/30 px-3 -mx-3 rounded-xl cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-text-primary leading-tight">{task.title}</h4>
                  <p className="text-xs text-text-muted flex items-center gap-1">📅 Due: {task.deadlineText}</p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      task.priority === "high"
                        ? "bg-error/15 text-error"
                        : task.priority === "medium"
                        ? "bg-warning/15 text-warning"
                        : "bg-text-muted/15 text-text-muted"
                    }`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      task.status === "completed"
                        ? "bg-success/15 text-success"
                        : task.status === "scheduled"
                        ? "bg-success/10 text-success"
                        : "bg-accent-ai/10 text-accent-ai"
                    }`}
                  >
                    {task.status}
                  </span>
                  <span className="text-xs text-text-muted font-mono bg-bg-base px-2 py-1 rounded border border-border/30">
                    {task.completedSubtasksCount}/{task.subtasksCount} subtasks
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
