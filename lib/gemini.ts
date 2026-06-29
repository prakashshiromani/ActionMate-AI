import { GoogleGenerativeAI, FunctionDeclaration, Tool, GenerateContentResult } from "@google/generative-ai";
import { checkCalendarAvailability } from "./googleCalendar";
import { PendingAction } from "@/types";

class ApiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private cooldowns: Map<number, number> = new Map(); // index -> cooldown expiry timestamp

  constructor() {
    const keysStr = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    this.keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);
    if (this.keys.length === 0) {
      console.warn("ApiKeyManager: No Gemini API keys found. Calls will fail.");
    }
  }

  public getActiveKey(): string {
    if (this.keys.length === 0) return "";
    return this.keys[this.currentIndex];
  }

  public rotateKey(): string {
    if (this.keys.length <= 1) return this.getActiveKey();

    // Set 60-second cooldown on the current key that failed
    this.cooldowns.set(this.currentIndex, Date.now() + 60 * 1000);

    // Find the next available key not in cooldown
    let found = false;
    for (let i = 1; i <= this.keys.length; i++) {
      const nextIndex = (this.currentIndex + i) % this.keys.length;
      const cooldownExpiry = this.cooldowns.get(nextIndex) || 0;
      if (Date.now() > cooldownExpiry) {
        this.currentIndex = nextIndex;
        found = true;
        break;
      }
    }

    // If all keys are in cooldown, fall back to simple sequential round-robin
    if (!found) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }

    console.log(`Rotating Gemini API key. New active index: ${this.currentIndex}`);
    return this.getActiveKey();
  }

  public getKeysCount(): number {
    return this.keys.length;
  }
}

const apiKeyManager = new ApiKeyManager();

class RotatableChatSession {
  private keyManager: ApiKeyManager;
  private chat!: any;
  private history: any[] = [];
  private modelName: string;
  private tools: Tool[];
  private systemInstruction: string;

  constructor(
    keyManager: ApiKeyManager,
    modelName: string,
    tools: Tool[],
    systemInstruction: string,
    initialHistory: any[]
  ) {
    this.keyManager = keyManager;
    this.modelName = modelName;
    this.tools = tools;
    this.systemInstruction = systemInstruction;
    this.history = initialHistory;
    this.initChatSession();
  }

  private initChatSession() {
    const key = this.keyManager.getActiveKey();
    const genAIInstance = new GoogleGenerativeAI(key);
    const model = genAIInstance.getGenerativeModel({
      model: this.modelName,
      tools: this.tools,
      systemInstruction: this.systemInstruction,
    });
    this.chat = model.startChat({
      history: this.history,
    });
  }

  public async sendMessage(
    message: any,
    retries = 3,
    delay = 1000
  ): Promise<any> {
    let currentRetries = retries;
    let currentDelay = delay;
    let rotationAttempts = 0;
    const maxRotations = this.keyManager.getKeysCount();

    while (true) {
      try {
        const result = await this.chat.sendMessage(message);
        // Sync history after successful communication
        this.history = await this.chat.getHistory();
        return result;
      } catch (error: any) {
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes("429")) ||
          (error.message && error.message.includes("ResourceExhausted"));

        const is503 =
          error.status === 503 ||
          (error.message && error.message.includes("503"));

        // If rate limited and we have multiple keys, rotate and recreate the session
        if (isRateLimit && this.keyManager.getKeysCount() > 1 && rotationAttempts < maxRotations) {
          console.warn(`Gemini Rate Limit (429) hit. Rotating key...`);
          
          // Attempt to extract latest history from the current chat session before resetting it
          try {
            this.history = await this.chat.getHistory();
          } catch (histErr) {
            console.warn("Failed to get chat history; reusing previously synced state.", histErr);
          }

          this.keyManager.rotateKey();
          this.initChatSession();
          rotationAttempts++;
          continue; // Retry sending message immediately with the new session
        }

        // Retry 503 errors using standard backoff
        if (is503 && currentRetries > 0) {
          console.warn(`Gemini 503 error. Retrying in ${currentDelay}ms... (${currentRetries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          currentDelay *= 2;
          currentRetries--;
          continue;
        }

        // Throw any unhandled error or if we exhausted all fallback options
        throw error;
      }
    }
  }

  public get response() {
    return this.chat;
  }
}

const checkCalendarAvailabilityTool: FunctionDeclaration = {
  name: "check_calendar_availability",
  description: "Check the user's Google Calendar for free/busy time slots on a given date range. Call this whenever the user mentions time, scheduling, or a deadline that needs a work block.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      date_range_start: {
        type: "STRING" as any,
        description: "Start of range to check. ISO 8601 format: YYYY-MM-DD",
      },
      date_range_end: {
        type: "STRING" as any,
        description: "End of range to check. ISO 8601 format: YYYY-MM-DD",
      },
    },
    required: ["date_range_start", "date_range_end"],
  },
};

const blockCalendarSlotTool: FunctionDeclaration = {
  name: "block_calendar_slot",
  description: "Create a focused work event in the user's Google Calendar. Only suggest this after check_calendar_availability confirms a free slot exists.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      start_time: {
        type: "STRING" as any,
        description: "Event start. ISO 8601 datetime with timezone: e.g., 2026-06-30T14:00:00+05:30",
      },
      end_time: {
        type: "STRING" as any,
        description: "Event end. ISO 8601 datetime with timezone.",
      },
      title: {
        type: "STRING" as any,
        description: "Event title. Format: 'Deep Work: [task name]'",
      },
      description: {
        type: "STRING" as any,
        description: "Optional event description containing a list of subtasks.",
      },
    },
    required: ["start_time", "end_time", "title"],
  },
};

const draftGmailEmailTool: FunctionDeclaration = {
  name: "draft_gmail_email",
  description: "Create a Gmail draft on behalf of the user. Use this when a deadline is at risk (e.g. less than 24 hours and calendar is full) to request an extension, or to send a meeting confirmation.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      to: {
        type: "STRING" as any,
        description: "Recipient email address. If unknown, use placeholder: 'recipient@example.com'",
      },
      subject: {
        type: "STRING" as any,
        description: "Email subject line.",
      },
      body: {
        type: "STRING" as any,
        description: "Full email body in plain text. Professional, polite, and concise.",
      },
    },
    required: ["subject", "body"],
  },
};

const breakdownTaskTool: FunctionDeclaration = {
  name: "breakdown_task",
  description: "Break a high-level task into 3-6 ordered subtasks with time estimates. Call this for any new task the user mentions.",
  parameters: {
    type: "OBJECT" as any,
    properties: {
      task_description: {
        type: "STRING" as any,
        description: "The full task description.",
      },
      deadline: {
        type: "STRING" as any,
        description: "Task deadline in ISO 8601 format.",
      },
      subtasks: {
        type: "ARRAY" as any,
        description: "List of 3-6 detailed subtasks generated for this task.",
        items: {
          type: "OBJECT" as any,
          properties: {
            title: {
              type: "STRING" as any,
              description: "Action-oriented title of the subtask.",
            },
            estimatedMinutes: {
              type: "NUMBER" as any,
              description: "Estimated time in minutes to complete this subtask.",
            },
          },
          required: ["title", "estimatedMinutes"],
        },
      },
    },
    required: ["task_description", "deadline", "subtasks"],
  },
};

export const agentTools: Tool[] = [
  {
    functionDeclarations: [
      checkCalendarAvailabilityTool,
      blockCalendarSlotTool,
      draftGmailEmailTool,
      breakdownTaskTool,
    ],
  },
];

const SYSTEM_PROMPT = `You are ActionMate, an AI productivity agent for Indian students and professionals.
Your job is to help users plan and execute tasks before deadlines — not just remind them.

RULES:
1. Always extract: task name, deadline, urgency level, and any constraints from the user's message.
2. If the user mentions scheduling or time, ALWAYS call check_calendar_availability first.
3. If a deadline is at risk (less than 24 hours and calendar is full), you MUST proactively call draft_gmail_email to prepare a backup extension request draft. Do not ask the user for permission in text first.
4. If there is a calendar space or a need for a study session, you MUST proactively call block_calendar_slot to suggest blocking a focused work slot. Do not ask the user for permission in text first.
5. All block_calendar_slot and draft_gmail_email calls will be caught as pending actions for the user to click and approve. Respond in your text message assuming the user will click "Approve & Execute" on these cards.
6. When a user introduces a new task, activity, or assignment, you MUST call breakdown_task to break it down into 3-6 detailed, action-oriented subtasks with realistic time estimates. Call breakdown_task tool to format them. Do NOT call breakdown_task, block_calendar_slot, or draft_gmail_email for simple greetings (like "hello", "hi"), casual talk, thank yous, or general questions that do not involve creating or scheduling a new task/activity.
7. The user may write in Hinglish (Hindi + English mix). Understand it naturally. Respond in the same language they used.
8. Be extremely direct and action-oriented. Do NOT ask clarifying questions or confirmation questions like "Should I draft the email?" or "Bataiye kya karna hai?". Instead, call the tools immediately so the cards appear on their screen.
9. Current datetime will be injected into each message (containing the user's local timezone offset, e.g., +05:30). Use it for all deadline calculations. When calling block_calendar_slot, ensure that the start_time and end_time have the same timezone offset as this current datetime, so events are scheduled at the user's correct local time.
10. Make your text messages extremely scannable for busy users. Avoid long blocks of text. Highlight key facts (such as the specific **deadline**, **blocked calendar time slots**, **email recipient**, or **main action items**) using bold markdown (double asterisks around the text) and clean list items so they stand out immediately.
11. If the user specifies an explicit start time and end time (or duration) for a calendar slot (e.g. "5 se 7 baje"), you MUST schedule it exactly as requested. Do NOT shorten, truncate, or shift the start/end times automatically due to conflicts. If there is a conflict, proceed with blocking the slot exactly as the user specified, and inform the user of the conflict in your text response.
12. When asked to resolve a conflict, adjust a schedule, or reschedule slots (e.g., "Resolve conflict between..."), you MUST call the block_calendar_slot tool for the new/adjusted/non-overlapping time slots so that the user receives the updated action cards for approval. Do NOT just mention the new times in text; you MUST call the tools to present the action cards.

TONE: Helpful, efficient, slightly casual. Like a capable friend who handles logistics.`;

export async function runAgentLoop(
  googleAccessToken: string,
  userMessage: string,
  history: any[] = [],
  currentDatetime: string
): Promise<{
  agentText: string;
  pendingActions: PendingAction[];
  suggestedSubtasks: Array<{ title: string; estimatedMinutes: number }>;
  isTask: boolean;
  conflict?: { message: string; details: string; actionPrompt: string } | null;
}> {
  // Gemini chat history MUST start with a message from the 'user'.
  // We locate the first 'user' role message and slice the history from that point forward.
  const firstUserIdx = history.findIndex((h) => h.role === "user");
  const slicedHistory = firstUserIdx !== -1 ? history.slice(firstUserIdx) : history;

  const formattedHistory = slicedHistory.map((h) => ({
    role: h.role,
    parts: [{ text: h.parts[0].text }],
  }));

  const chatSession = new RotatableChatSession(
    apiKeyManager,
    "gemini-flash-lite-latest",
    agentTools,
    SYSTEM_PROMPT,
    formattedHistory
  );

  // Inject current datetime as context for the model
  const messageWithContext = `[Context: Current Datetime is ${currentDatetime}]\n\n${userMessage}`;

  let result = await chatSession.sendMessage(messageWithContext);
  let response = result.response;

  const pendingActions: PendingAction[] = [];
  let suggestedSubtasks: Array<{ title: string; estimatedMinutes: number }> = [];
  let isTask = false;
  const allBusySlots: Array<{ start: string; end: string; summary?: string }> = [];

  // Agent execution loop
  let iterations = 0;
  const maxIterations = 5;

  while (response.functionCalls() && iterations < maxIterations) {
    iterations++;
    const functionCalls = response.functionCalls() || [];
    const functionResponses: any[] = [];

    for (const call of functionCalls) {
      const { name, args } = call;

      if (name === "check_calendar_availability") {
        try {
          const start = (args as any).date_range_start;
          const end = (args as any).date_range_end;
          const busySlots = await checkCalendarAvailability(googleAccessToken, start, end);
          allBusySlots.push(...busySlots);
          functionResponses.push({
            functionResponse: {
              name,
              response: { busy_slots: busySlots },
            },
          });
        } catch (error: any) {
          functionResponses.push({
            functionResponse: {
              name,
              response: { error: error.message || "Failed to check calendar" },
            },
          });
        }
      } else if (name === "breakdown_task") {
        isTask = true;
        const payload = args as any;
        if (payload.subtasks && Array.isArray(payload.subtasks)) {
          suggestedSubtasks = payload.subtasks;
        }
        functionResponses.push({
          functionResponse: {
            name,
            response: { status: "success" },
          },
        });
      } else if (name === "block_calendar_slot") {
        isTask = true;
        // Intercept block_calendar_slot and queue as pending action
        const payload = args as any;
        pendingActions.push({
          type: "CALENDAR_BLOCK",
          payload: {
            start_time: payload.start_time,
            end_time: payload.end_time,
            title: payload.title,
            description: payload.description,
          },
          displaySummary: `Create calendar event "${payload.title}" for ${new Date(
            payload.start_time
          ).toLocaleString()}`,
        });
        functionResponses.push({
          functionResponse: {
            name,
            response: { status: "pending_approval", message: "Action queued for user approval." },
          },
        });
      } else if (name === "draft_gmail_email") {
        isTask = true;
        // Intercept draft_gmail_email and queue as pending action
        const payload = args as any;
        pendingActions.push({
          type: "GMAIL_DRAFT",
          payload: {
            to: payload.to || "recipient@example.com",
            subject: payload.subject,
            body: payload.body,
          },
          displaySummary: `Draft email to "${payload.to || "recipient@example.com"}" with subject "${payload.subject}"`,
        });
        functionResponses.push({
          functionResponse: {
            name,
            response: { status: "pending_approval", message: "Action queued for user approval." },
          },
        });
      } else {
        functionResponses.push({
          functionResponse: {
            name,
            response: { error: `Unknown tool: ${name}` },
          },
        });
      }
    }

    // Send function execution results back to the model
    result = await chatSession.sendMessage(functionResponses);
    response = result.response;
  }

  // Fallback to default subtasks only if none were dynamically generated and this is a task
  if (isTask && suggestedSubtasks.length === 0) {
    suggestedSubtasks = [
      { title: "Review instructions & gather references", estimatedMinutes: 30 },
      { title: "Draft core contents & structure schema", estimatedMinutes: 60 },
      { title: "Final formatting & submit check", estimatedMinutes: 30 },
    ];
  }

  // Check for calendar conflicts: directly query calendar for each pending CALENDAR_BLOCK action.
  // This ensures conflict detection works even if the AI skipped check_calendar_availability.
  let conflict = null;
  for (const action of pendingActions) {
    if (action.type === "CALENDAR_BLOCK") {
      const startStr = action.payload.start_time as string | undefined;
      const endStr = action.payload.end_time as string | undefined;
      if (!startStr || !endStr) continue;

      const blockStart = new Date(startStr).getTime();
      const blockEnd = new Date(endStr).getTime();

      // Extract date from the start time (YYYY-MM-DD)
      const blockDate = startStr.split("T")[0];

      // Fetch fresh calendar events for the block date to catch any events
      // not in allBusySlots (e.g. when AI skipped check_calendar_availability)
      let slotsToCheck = allBusySlots;
      try {
        const freshSlots = await checkCalendarAvailability(googleAccessToken, blockDate, blockDate);
        // Merge with allBusySlots and deduplicate by start time
        const merged = [...allBusySlots];
        for (const fresh of freshSlots) {
          if (!merged.some(s => s.start === fresh.start)) {
            merged.push(fresh);
          }
        }
        slotsToCheck = merged;
      } catch (_) {
        // Ignore errors — fall back to allBusySlots
      }

      for (const slot of slotsToCheck) {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();

        if (blockStart < slotEnd && blockEnd > slotStart) {
          // Ignore self-conflict when rescheduling the same task (titles match)
          const actionTitle = (action.payload.title || "").replace(/^Deep Work:\s*/i, "").trim().toLowerCase();
          const slotTitle = ((slot as any).summary || "").replace(/^Deep Work:\s*/i, "").trim().toLowerCase();
          if (actionTitle === slotTitle && actionTitle !== "") {
            continue;
          }

          // Conflict detected!
          conflict = {
            message: "Schedule conflict detected",
            details: `"${action.payload.title}" overlaps with "${(slot as any).summary || 'Busy Slot'}" at ${new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            actionPrompt: `Resolve conflict between "${action.payload.title}" and "${(slot as any).summary || 'Busy Slot'}"`
          };
          break;
        }
      }
      if (conflict) break;
    }
  }

  return {
    agentText: response.text() || "I have analyzed your request.",
    pendingActions,
    suggestedSubtasks,
    isTask,
    conflict,
  };
}

// Helper function to retry sendMessage on transient 503 errors
async function sendMessageWithRetry(chatSession: any, message: any, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await chatSession.sendMessage(message);
    } catch (error: any) {
      const is503 = error.status === 503 || (error.message && error.message.includes("503"));
      if (is503 && i < retries - 1) {
        console.warn(`Gemini API returned 503. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed to send message after retries");
}
