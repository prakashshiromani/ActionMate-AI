"use client";

import { useState } from "react";
import { PendingAction } from "@/types";

interface AgentActionCardProps {
  pendingActions: PendingAction[];
  taskId: string;
  onSuccess: (results: any[]) => void;
  onDismiss: () => void;
}

export default function AgentActionCard({
  pendingActions,
  taskId,
  onSuccess,
  onDismiss,
}: AgentActionCardProps) {
  const [actions, setActions] = useState<PendingAction[]>(pendingActions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditChange = (index: number, field: string, value: any) => {
    setActions((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        payload: {
          ...copy[index].payload,
          [field]: value,
        },
      };
      return copy;
    });
  };

  const handleApproveAll = async () => {
    setExecuting(true);
    setError(null);

    // Retrieve delegated access token from sessionStorage
    const googleAccessToken = sessionStorage.getItem("googleAccessToken") || "";

    try {
      const response = await fetch("/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-access-token": googleAccessToken,
        },
        body: JSON.stringify({
          approvedActions: actions,
          taskId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Execution failed");
      }

      onSuccess(data.results || []);
    } catch (err: any) {
      console.error("Action execution failed:", err);
      setError(err.message || "Failed to execute recommended actions. Make sure you are signed in.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-transparent bg-gradient-to-tr from-accent-primary to-accent-ai p-[2px] shadow-2xl animate-fade-in w-full">
      <div className="rounded-[14px] bg-bg-surface p-5 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-extrabold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-ai uppercase">
              ActionMate suggests
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-primary text-sm p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-error/10 border border-error/30 p-3 text-xs text-error text-center">
            {error}
          </div>
        )}

        {/* Action Items List */}
        <div className="space-y-3.5">
          {actions.map((action, index) => {
            const isEditing = editingIndex === index;
            const isCalendar = action.type === "CALENDAR_BLOCK";

            return (
              <div key={index} className="space-y-3 p-3 rounded-xl bg-bg-base border border-border/30 min-w-0">
                <div className="flex justify-between items-start gap-2 min-w-0">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{isCalendar ? "📅" : "📧"}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-accent-ai uppercase tracking-wider">
                        {isCalendar ? "Calendar" : "Gmail"}
                      </span>
                      <p className="text-xs text-text-primary mt-0.5 font-medium leading-relaxed break-words">
                        {action.displaySummary}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingIndex(isEditing ? null : index)}
                    className="text-xs text-accent-primary hover:brightness-110 font-bold transition-all flex-shrink-0 ml-2"
                  >
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
                
                {/* Proposed details preview (visible before edit mode) */}
                {!isEditing && (
                  <div className="mt-2 text-[11px] text-text-muted bg-white/[0.02] border border-white/5 rounded-lg p-2.5 space-y-1.5 leading-normal">
                    {isCalendar ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-semibold text-text-primary">Event:</span>
                          <span className="text-right truncate max-w-[200px]">{action.payload.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-text-primary">Time:</span>
                          <span className="text-right">
                            {action.payload.start_time ? new Date(action.payload.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""} -{" "}
                            {action.payload.end_time ? new Date(action.payload.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        {action.payload.description && (
                          <div className="text-[10px] text-slate-400 italic mt-1 border-t border-white/5 pt-1.5 line-clamp-2">
                            {action.payload.description}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="font-semibold text-text-primary">To:</span>
                          <span className="truncate max-w-[200px]">{action.payload.to || "recipient@example.com"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-text-primary">Subject:</span>
                          <span className="truncate max-w-[200px] font-medium text-slate-300">{action.payload.subject}</span>
                        </div>
                        <div className="mt-1.5 border-t border-white/5 pt-1.5 whitespace-pre-wrap text-[10.5px] text-text-primary bg-white/[0.015] p-2 rounded border border-white/5 max-h-24 overflow-y-auto font-sans leading-relaxed">
                          {action.payload.body}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Inline Editing Fields */}
                {isEditing && (
                  <div className="space-y-2.5 pt-2 border-t border-border/40 text-xs">
                    {isCalendar ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-text-muted font-semibold">Title</label>
                          <input
                            type="text"
                            value={action.payload.title || ""}
                            onChange={(e) => handleEditChange(index, "title", e.target.value)}
                            className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-text-muted font-semibold">Start Time</label>
                            <input
                              type="datetime-local"
                              value={action.payload.start_time ? action.payload.start_time.substring(0, 16) : ""}
                              onChange={(e) => handleEditChange(index, "start_time", e.target.value)}
                              className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-text-muted font-semibold">End Time</label>
                            <input
                              type="datetime-local"
                              value={action.payload.end_time ? action.payload.end_time.substring(0, 16) : ""}
                              onChange={(e) => handleEditChange(index, "end_time", e.target.value)}
                              className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-text-muted font-semibold">Recipient</label>
                          <input
                            type="email"
                            value={action.payload.to || ""}
                            onChange={(e) => handleEditChange(index, "to", e.target.value)}
                            className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-text-muted font-semibold">Subject</label>
                          <input
                            type="text"
                            value={action.payload.subject || ""}
                            onChange={(e) => handleEditChange(index, "subject", e.target.value)}
                            className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-text-muted font-semibold">Email Body</label>
                          <textarea
                            rows={3}
                            value={action.payload.body || ""}
                            onChange={(e) => handleEditChange(index, "body", e.target.value)}
                            className="w-full bg-bg-surface border border-border rounded-lg p-2 text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={handleApproveAll}
            disabled={executing}
            className="flex-1 bg-success hover:brightness-110 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            {executing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Executing...
              </>
            ) : (
              "Approve & Execute All"
            )}
          </button>
          <button
            onClick={onDismiss}
            disabled={executing}
            className="bg-border/20 hover:bg-bg-raised disabled:opacity-50 text-text-primary font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-border"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
