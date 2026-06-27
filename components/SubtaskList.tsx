"use client";

import { Subtask } from "@/types";

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggleSubtask: (subtaskId: string, completed: boolean) => void;
}

export default function SubtaskList({ subtasks, onToggleSubtask }: SubtaskListProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Subtasks</h3>
      <div className="space-y-1.5">
        {subtasks.length === 0 ? (
          <p className="text-xs text-text-muted italic">No subtasks generated for this task.</p>
        ) : (
          subtasks.map((subtask) => (
            <label
              key={subtask.subtaskId}
              className={`flex items-center justify-between p-3 rounded-xl border border-border/40 bg-bg-surface hover:bg-bg-raised transition-all duration-150 cursor-pointer ${
                subtask.completed ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Custom SVG Checkbox with draw-in animation */}
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={(e) => onToggleSubtask(subtask.subtaskId, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-5 rounded border border-border bg-bg-base flex items-center justify-center transition-all peer-checked:bg-success peer-checked:border-success">
                    {subtask.completed && (
                      <svg
                        className="h-3 w-3 text-white animate-scale-up"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="4"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Subtask Title */}
                <span
                  className={`text-xs font-medium text-text-primary transition-all duration-150 ${
                    subtask.completed ? "line-through text-text-muted" : ""
                  }`}
                >
                  {subtask.title}
                </span>
              </div>

              {/* Time Estimate / Completed Check */}
              <span className="text-[10px] font-bold text-text-muted bg-bg-base border border-border/30 px-2 py-0.5 rounded-md">
                {subtask.completed ? "✓ Done" : `${subtask.estimatedMinutes} min`}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
