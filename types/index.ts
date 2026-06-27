export interface UserPreferences {
  defaultWorkHours: {
    start: string; // e.g., "09:00"
    end: string;   // e.g., "21:00"
  };
  timezone: string; // e.g., "Asia/Kolkata"
  language: "en" | "hi" | "hinglish";
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  preferences: UserPreferences;
  createdAt: any; // Firestore Timestamp
  lastActiveAt: any; // Firestore Timestamp
}

export interface Subtask {
  subtaskId: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt: any | null; // Firestore Timestamp or null
}

export interface AgentAction {
  actionType: "CALENDAR_BLOCK" | "GMAIL_DRAFT" | "TASK_BREAKDOWN" | "CONFLICT_DETECTED";
  status: "pending_approval" | "approved" | "rejected" | "executed" | "failed";
  executedAt: any | null; // Firestore Timestamp or null
  detail: string; // e.g., "Blocked Sun 10 AM – 12 PM"
}

export interface Task {
  taskId: string;
  userId: string;
  title: string;
  rawInput: string;
  description: string;
  status: "pending" | "in_progress" | "scheduled" | "completed" | "deferred";
  priority: "high" | "medium" | "low";
  deadline: any; // Firestore Timestamp
  deadlineText: string; // e.g., "Tomorrow, 11:59 PM"
  subtasks: Subtask[];
  calendarEventId: string | null;
  gmailDraftId: string | null;
  agentActions: AgentAction[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp;
}

export interface AgentLog {
  logId: string;
  userId: string;
  taskId: string | null;
  userPrompt: string;
  geminiResponse: {
    toolsCalled: string[];
    iterationCount: number;
    finalText: string;
  };
  pendingActionsCount: number;
  approvedActionsCount: number | null;
  executionStatus: "pending_approval" | "approved" | "rejected" | "partially_approved";
  latencyMs: number;
  timestamp: any; // Firestore Timestamp
}

export interface PendingAction {
  type: "CALENDAR_BLOCK" | "GMAIL_DRAFT" | "TASK_BREAKDOWN";
  payload: {
    start_time?: string;
    end_time?: string;
    title?: string;
    description?: string;
    to?: string;
    subject?: string;
    body?: string;
    subtasks?: Array<{ title: string; estimatedMinutes: number }>;
  };
  displaySummary: string;
}
