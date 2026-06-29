"use client";

import React, { useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Helper to format status
  const formatStatus = (status: string) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      {/* Filter and Search Bar controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border border-border bg-bg-surface rounded-2xl">
        <div>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-primary text-text-primary placeholder:text-text-muted"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-bg-base border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-primary text-text-primary"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-bg-base border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-accent-primary text-text-primary"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-6">
        <div className="divide-y divide-border/50">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 space-y-3.5 select-none">
              <span className="text-4xl block">📋</span>
              <div>
                <p className="text-sm font-bold text-text-primary">No tasks found</p>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  {tasks.length === 0 
                    ? "Your workspace is empty. Create a task using the AI voice/text chat assistant on the right!" 
                    : "No tasks match your filter criteria. Try adjusting the search text or dropdown selectors."}
                </p>
              </div>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-bg-raised/30 px-3 -mx-3 rounded-xl cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-text-primary leading-tight">{task.title}</h4>
                  <p className="text-xs text-text-muted flex items-center gap-1">📅 Due: {task.deadlineText}</p>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
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
                    {formatStatus(task.status)}
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
