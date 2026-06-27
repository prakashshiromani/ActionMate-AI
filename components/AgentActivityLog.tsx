"use client";

import { AgentAction } from "@/types";

interface AgentActivityLogProps {
  actions: AgentAction[];
}

export default function AgentActivityLog({ actions }: AgentActivityLogProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Agent Activity Log</h3>
      
      {actions.length === 0 ? (
        <p className="text-xs text-text-muted italic">No activity recorded for this task yet.</p>
      ) : (
        <div className="relative pl-6 space-y-5 border-l-2 border-accent-primary/30 ml-3">
          {actions.map((action, index) => {
            const isCompleted = action.status === "executed" || action.status === "approved";
            const isFailed = action.status === "failed";
            
            // Map action status colors
            let statusColor = "bg-warning";
            let statusText = "Pending Approval";
            if (isCompleted) {
              statusColor = "bg-success";
              statusText = "Executed";
            } else if (isFailed) {
              statusColor = "bg-error";
              statusText = "Failed";
            }

            // Map action icons
            let icon = "⚙️";
            if (action.actionType === "CALENDAR_BLOCK") icon = "📅";
            if (action.actionType === "GMAIL_DRAFT") icon = "📧";
            if (action.actionType === "CONFLICT_DETECTED") icon = "⚠️";

            return (
              <div key={index} className="relative group">
                {/* Timeline Node Dot */}
                <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-surface ${statusColor} shadow-sm transition-transform duration-250 group-hover:scale-125`} />
                
                {/* Timeline content log styled in monospaced font */}
                <div className="font-mono text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-[10px]">
                      {action.executedAt ? new Date(action.executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Pending"}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                      isCompleted ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                    }`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed font-semibold flex items-center gap-1.5">
                    <span>{icon}</span> {action.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
