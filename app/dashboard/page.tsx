"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import AgentActionCard from "@/components/AgentActionCard";
import ConflictBanner from "@/components/ConflictBanner";
import SubtaskList from "@/components/SubtaskList";
import AgentActivityLog from "@/components/AgentActivityLog";
import SkeletonLoader from "@/components/SkeletonLoader";
import { PendingAction } from "@/types";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

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
  actions?: PendingAction[];
  taskId?: string;
  executed?: boolean;
  dismissed?: boolean;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(true); // Toggle chat panel on mobile
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hey! Aryan here, ready to resolve your tasks. What's on your plate today?" }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Resizable Chat Panel states & logic
  const [chatWidth, setChatWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 280;
      const maxWidth = Math.min(650, window.innerWidth * 0.6);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setChatWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  // Auto-resize textarea height
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputText]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingText]);

  // Auto-load simulation for skeleton animation
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);



  // Check Google OAuth token on load and display warning if missing
  useEffect(() => {
    const token = sessionStorage.getItem("googleAccessToken");
    if (!token) {
      setAuthError("Google OAuth session expired. Please sign in again to sync Calendar & Gmail.");
    }
  }, []);



  // Dynamic state for task lists to update them on action success
  const [tasks, setTasks] = useState<MockTask[]>([
    {
      id: "1",
      title: "Submit DBMS Assignment",
      priority: "high",
      status: "in_progress",
      deadlineText: "Tomorrow, 11:59 PM",
      subtasksCount: 5,
      completedSubtasksCount: 1,
    },
    {
      id: "2",
      title: "Client Presentation slides",
      priority: "high",
      status: "in_progress",
      deadlineText: "Today, 5:00 PM",
      subtasksCount: 4,
      completedSubtasksCount: 1,
    },
    {
      id: "3",
      title: "Prepare DBMS ER Diagrams",
      priority: "medium",
      status: "completed",
      deadlineText: "Yesterday",
      subtasksCount: 3,
      completedSubtasksCount: 3,
    },
    {
      id: "4",
      title: "Revise SQL queries",
      priority: "low",
      status: "pending",
      deadlineText: "June 29, 2:00 PM",
      subtasksCount: 2,
      completedSubtasksCount: 0,
    }
  ]);

  // Subtask list mapping
  const [subtasksMap, setSubtasksMap] = useState<Record<string, any[]>>({
    "1": [
      { subtaskId: "s1", title: "Read DBMS Chapter 4 - ER Diagrams", estimatedMinutes: 30, completed: false, completedAt: null },
      { subtaskId: "s2", title: "Draw relational schema on paper", estimatedMinutes: 15, completed: false, completedAt: null },
      { subtaskId: "s3", title: "Write SQL schema in code", estimatedMinutes: 45, completed: false, completedAt: null },
      { subtaskId: "s4", title: "Write 5 required queries", estimatedMinutes: 60, completed: false, completedAt: null },
      { subtaskId: "s5", title: "Review and format submission file", estimatedMinutes: 20, completed: true, completedAt: new Date() }
    ],
    "2": [
      { subtaskId: "s21", title: "Outline presentation structure", estimatedMinutes: 20, completed: true, completedAt: new Date() },
      { subtaskId: "s22", title: "Gather slide content details", estimatedMinutes: 40, completed: false, completedAt: null },
      { subtaskId: "s23", title: "Design slides layout & colors", estimatedMinutes: 45, completed: false, completedAt: null },
      { subtaskId: "s24", title: "Rehearse presentation script", estimatedMinutes: 30, completed: false, completedAt: null }
    ],
    "3": [
      { subtaskId: "s31", title: "Identify ER entities", estimatedMinutes: 15, completed: true, completedAt: new Date() },
      { subtaskId: "s32", title: "Define ER primary keys", estimatedMinutes: 15, completed: true, completedAt: new Date() },
      { subtaskId: "s33", title: "Create relationship mappings", estimatedMinutes: 25, completed: true, completedAt: new Date() }
    ],
    "4": [
      { subtaskId: "s41", title: "Review SELECT statements", estimatedMinutes: 20, completed: false, completedAt: null },
      { subtaskId: "s42", title: "Practice JOIN queries", estimatedMinutes: 40, completed: false, completedAt: null }
    ]
  });

  // Agent activity logs mapping
  const [actionsMap, setActionsMap] = useState<Record<string, any[]>>({
    "1": [
      { actionType: "CALENDAR_BLOCK", status: "executed", executedAt: new Date(Date.now() - 3600000), detail: "Blocked Sunday 10 AM - 12 PM" },
      { actionType: "GMAIL_DRAFT", status: "executed", executedAt: new Date(Date.now() - 3550000), detail: "Gmail Draft saved to Prof. Sharma" }
    ],
    "2": [
      { actionType: "CONFLICT_DETECTED", status: "executed", executedAt: new Date(Date.now() - 7200000), detail: "Deadline conflict detected at 5 PM" }
    ],
    "3": [
      { actionType: "TASK_BREAKDOWN", status: "executed", executedAt: new Date(Date.now() - 86400000), detail: "Autonomously generated subtask breakdown" }
    ],
    "4": []
  });

  // Fetch real-time tasks & logs from Firestore (if logged in) or LocalStorage (if Sandbox)
  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== "function") return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db && db.app) {
        try {
          setLoadingText("Fetching your workspace tasks and logs...");
          const tasksRef = collection(db, "tasks");
          const q = query(tasksRef, where("userId", "==", user.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const fetchedTasks: MockTask[] = [];
            const fetchedSubtasksMap: Record<string, any[]> = {};
            const fetchedActionsMap: Record<string, any[]> = {};

            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const taskId = data.taskId || docSnap.id;

              fetchedTasks.push({
                id: taskId,
                title: data.title || "Untitled Task",
                priority: data.priority || "medium",
                status: data.status || "pending",
                deadlineText: data.deadlineText || "Tomorrow",
                subtasksCount: data.subtasks ? data.subtasks.length : 0,
                completedSubtasksCount: data.subtasks ? data.subtasks.filter((st: any) => st.completed).length : 0,
              });

              fetchedSubtasksMap[taskId] = data.subtasks || [];
              fetchedActionsMap[taskId] = data.agentActions || [];
            });

            setTasks(fetchedTasks);
            setSubtasksMap(fetchedSubtasksMap);
            setActionsMap(fetchedActionsMap);
          }
        } catch (error) {
          console.error("Error fetching tasks from Firestore:", error);
        } finally {
          setLoadingText(null);
        }
      } else {
        // Fallback to LocalStorage for Sandbox Mode
        const cachedTasks = localStorage.getItem("sandboxTasks");
        const cachedSubtasks = localStorage.getItem("sandboxSubtasks");
        const cachedActions = localStorage.getItem("sandboxActions");

        if (cachedTasks && cachedSubtasks && cachedActions) {
          try {
            setTasks(JSON.parse(cachedTasks));
            setSubtasksMap(JSON.parse(cachedSubtasks));
            setActionsMap(JSON.parse(cachedActions));
          } catch (e) {
            console.error("Failed to parse sandbox cache:", e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Save Sandbox state to localStorage whenever it changes
  useEffect(() => {
    const token = typeof window !== "undefined" && sessionStorage.getItem("googleAccessToken");
    const isSandbox = !token || token === "mock-sandbox-token" || token === "mock-token-refresh" || token.startsWith("mock-");

    if (isSandbox && tasks.length > 0) {
      localStorage.setItem("sandboxTasks", JSON.stringify(tasks));
      localStorage.setItem("sandboxSubtasks", JSON.stringify(subtasksMap));
      localStorage.setItem("sandboxActions", JSON.stringify(actionsMap));
    }
  }, [tasks, subtasksMap, actionsMap]);

  const renderMessageText = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match;

    const parseBold = (str: string, keyPrefix: string) => {
      const boldRegex = /\*\*([^*]+)\*\*/g;
      const elements: ReactNode[] = [];
      let lastIdx = 0;
      let m;
      while ((m = boldRegex.exec(str)) !== null) {
        const plain = str.substring(lastIdx, m.index);
        if (plain) {
          elements.push(plain);
        }
        elements.push(
          <strong key={`${keyPrefix}-bold-${m.index}`} className="font-bold text-white">
            {m[1]}
          </strong>
        );
        lastIdx = boldRegex.lastIndex;
      }
      const rem = str.substring(lastIdx);
      if (rem) {
        elements.push(rem);
      }
      return elements;
    };

    while ((match = linkRegex.exec(text)) !== null) {
      const plainText = text.substring(lastIndex, match.index);
      if (plainText) {
        parts.push(...parseBold(plainText, `link-before-${match.index}`));
      }
      parts.push(
        <a
          key={`link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline font-bold"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(...parseBold(remainingText, "remaining"));
    }

    return (
      <span className="whitespace-pre-line">
        {parts.length > 0 ? parts : text}
      </span>
    );
  };

  const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;

    // Update subtasksMap
    setSubtasksMap((prev) => {
      const copy = { ...prev };
      const list = copy[taskId] || [];
      const idx = list.findIndex((st) => st.subtaskId === subtaskId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          completed,
          completedAt: completed ? new Date() : null,
        };
      }
      return copy;
    });

    // Update progress counters in tasks list
    setTasks((prev) => {
      return prev.map((t) => {
        if (t.id === taskId) {
          const list = subtasksMap[taskId] || [];
          const completedCount = list.filter((st) =>
            st.subtaskId === subtaskId ? completed : st.completed
          ).length;

          // Auto complete task if all subtasks are finished
          const status = completedCount === t.subtasksCount ? "completed" as const : t.status;

          return {
            ...t,
            completedSubtasksCount: completedCount,
            status,
          };
        }
        return t;
      });
    });

    // Sync selectedTask state
    setSelectedTask((prev) => {
      if (!prev) return null;
      const list = subtasksMap[taskId] || [];
      const completedCount = list.filter((st) =>
        st.subtaskId === subtaskId ? completed : st.completed
      ).length;
      return {
        ...prev,
        completedSubtasksCount: completedCount,
        status: completedCount === prev.subtasksCount ? "completed" : prev.status,
      };
    });

    // Sync subtask checkbox toggle to Firestore if user is authenticated and it is not a mock task
    const currentUser = auth?.currentUser;
    const isMockTask = taskId.startsWith("task-mock-") || taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4";
    if (currentUser && db && db.app && !isMockTask) {
      try {
        const taskRef = doc(db, "tasks", taskId);
        const list = subtasksMap[taskId] || [];
        const updatedList = list.map((st) => {
          if (st.subtaskId === subtaskId) {
            return {
              ...st,
              completed,
              completedAt: completed ? new Date().toISOString() : null,
            };
          }
          return st;
        });
        const completedCount = updatedList.filter((st) => st.completed).length;
        const status = completedCount === (selectedTask?.subtasksCount || 0) ? "completed" : selectedTask?.status;

        updateDoc(taskRef, {
          subtasks: updatedList,
          status,
          updatedAt: new Date(),
        }).catch((err) => console.error("Firestore subtask update error:", err));
      } catch (err) {
        console.error("Firestore sync setup error:", err);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userPrompt = inputText;
    const newMessages = [...messages, { sender: "user" as const, text: userPrompt }];
    setMessages(newMessages);
    setInputText("");
    
    // Cycle loading states during API call
    const loadingIntervals = [
      "Parsing your task...",
      "Checking your calendar for availability...",
      "Analyzing task constraints...",
      "Formulating agent execution plan..."
    ];
    let step = 0;
    setLoadingText(loadingIntervals[0]);
    
    const cycleTimer = setInterval(() => {
      step = (step + 1) % loadingIntervals.length;
      setLoadingText(loadingIntervals[step]);
    }, 1000);

    try {
      const googleAccessToken = sessionStorage.getItem("googleAccessToken") || "";
      
      const response = await fetch("/api/agent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-access-token": googleAccessToken,
        },
        body: JSON.stringify({
          userMessage: userPrompt,
          conversationHistory: newMessages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          })),
          currentDatetime: new Date().toISOString()
        })
      });

      clearInterval(cycleTimer);
      setLoadingText(null);

      if (!response.ok) {
        let errMsg = "API process failed";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      // Update UI with real AI response
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.agentText,
          actions: data.pendingActions && data.pendingActions.length > 0 ? data.pendingActions : undefined,
          taskId: data.taskId
        }
      ]);

      // If new task was created, add it to lanes dynamically
      if (data.taskId && data.suggestedSubtasks) {
        const newTask: MockTask = {
          id: data.taskId,
          title: userPrompt.length > 60 ? `${userPrompt.substring(0, 57)}...` : userPrompt,
          priority: ["urgent", "jaldi", "emergency", "important", "deadline", "kal", "cal", "today", "due", "subah", "tomorrow"].some(word => userPrompt.toLowerCase().includes(word)) ? "high" as const : "medium" as const,
          status: data.pendingActions && data.pendingActions.length > 0 ? "in_progress" : "pending",
          deadlineText: "Tomorrow",
          subtasksCount: data.suggestedSubtasks.length,
          completedSubtasksCount: 0
        };
        setTasks((prev) => [newTask, ...prev]);

        // Add subtasks to map
        setSubtasksMap((prev) => ({
          ...prev,
          [data.taskId]: data.suggestedSubtasks.map((st: any, i: number) => ({
            subtaskId: `st-${data.taskId}-${i}`,
            title: st.title,
            estimatedMinutes: st.estimatedMinutes,
            completed: false,
            completedAt: null
          }))
        }));

        // Add empty actions history
        setActionsMap((prev) => ({
          ...prev,
          [data.taskId]: data.pendingActions ? data.pendingActions.map((act: any) => ({
            actionType: act.type,
            status: "pending_approval",
            executedAt: null,
            detail: act.displaySummary
          })) : []
        }));
      }

    } catch (err: any) {
      console.warn("API processing failed:", err);
      clearInterval(cycleTimer);
      setLoadingText(null);

      const token = sessionStorage.getItem("googleAccessToken") || "";
      const isSandbox = token === "mock-sandbox-token" || token === "mock-token-refresh" || token.startsWith("mock-") || !token;

      if (isSandbox) {
        setLoadingText("Simulating agent workflow in sandbox mode...");
        setTimeout(() => {
          setLoadingText(null);

          // Simple heuristic to extract dynamic topic/subject from the prompt
          let topic = "Assignment";
          if (userPrompt.toLowerCase().includes("uml")) {
            topic = "UML Diagrams Assignment";
          } else if (userPrompt.toLowerCase().includes("dbms")) {
            topic = "DBMS Assignment";
          } else if (userPrompt.toLowerCase().includes("presentation")) {
            topic = "Presentation slides";
          } else {
            // Extract a generic action name
            const cleanPrompt = userPrompt.replace(/hi|hello|please|help|me|i am|prakash/gi, "").trim();
            topic = cleanPrompt.length > 40 ? `${cleanPrompt.substring(0, 37)}...` : cleanPrompt || "Assignment";
          }

          const mockTaskId = `task-mock-${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: `I've analyzed your request for **${topic}**. 

I found a schedule conflict:
• **Schedule Conflict:** Your calendar is busy tomorrow.
• **Action Block:** Suggesting a study/deep work slot.
• **Backup Plan:** Drafted an extension email to **Prof. Sharma** in your Gmail Drafts.

Please approve the action cards below:`,
              actions: [
                {
                  type: "CALENDAR_BLOCK",
                  payload: {
                    title: `Deep Work: ${topic}`,
                    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T10:00:00",
                    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T12:00:00",
                    description: `Blocked study slot from ActionMate recommendation for ${topic}`
                  },
                  displaySummary: `Create calendar event "Deep Work: ${topic}"`
                },
                {
                  type: "GMAIL_DRAFT",
                  payload: {
                    to: "sharma.prof@example.com",
                    subject: `Extension Request: ${topic} submission`,
                    body: `Dear Prof. Sharma,\n\nI am writing to request a brief 24-hour extension on the ${topic} due tomorrow. Due to scheduling conflicts, I need a bit more time to complete it to standard.\n\nThank you,\nAryan`
                  },
                  displaySummary: `Draft email to "sharma.prof@example.com" with subject "Extension Request: ${topic}"`
                }
              ],
              taskId: mockTaskId
            }
          ]);

          // Add subtasks and logs to lists dynamically
          setTasks((prev) => [
            {
              id: mockTaskId,
              title: userPrompt.length > 60 ? `${userPrompt.substring(0, 57)}...` : userPrompt,
              priority: "high",
              status: "in_progress",
              deadlineText: "Tomorrow",
              subtasksCount: 3,
              completedSubtasksCount: 0
            },
            ...prev
          ]);

          setSubtasksMap((prev) => ({
            ...prev,
            [mockTaskId]: [
              { subtaskId: `st-mock-${mockTaskId}-1`, title: `Review ${topic} requirements`, estimatedMinutes: 30, completed: false, completedAt: null },
              { subtaskId: `st-mock-${mockTaskId}-2`, title: `Draft core contents for ${topic}`, estimatedMinutes: 45, completed: false, completedAt: null },
              { subtaskId: `st-mock-${mockTaskId}-3`, title: `Verify and review ${topic}`, estimatedMinutes: 30, completed: false, completedAt: null }
            ]
          }));

          setActionsMap((prev) => ({
            ...prev,
            [mockTaskId]: [
              { actionType: "CALENDAR_BLOCK", status: "pending_approval", executedAt: null, detail: `Recommended block: Deep Work: ${topic}` },
              { actionType: "GMAIL_DRAFT", status: "pending_approval", executedAt: null, detail: `Recommended draft: Extension Request: ${topic}` }
            ]
          }));
        }, 1000);
      } else {
        // Render actual error bubble to guide real OAuth users
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `⚠️ **Agent Error:** Failed to process your request.\n\n**Details:** ${err.message || "Failed to contact local API server."}\n\n**Possible Causes:**\n- The Next.js dev server has not been restarted after adding the \`GEMINI_API_KEY\` to your \`.env.local\` file.\n- Your Gemini API Key is invalid or rate-limited.\n\nPlease check your server terminal console for complete error logs.`
          }
        ]);
      }
    }
  };

  const handleActionSuccess = (index: number, results: any[]) => {
    const msg = messages[index];
    const taskId = msg.taskId;

    setMessages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        executed: true
      };
      return copy;
    });

    const calendarResult = results.find(r => r.type === "CALENDAR_BLOCK");
    const gmailResult = results.find(r => r.type === "GMAIL_DRAFT");

    const calendarSuccess = calendarResult?.status === "success";
    const gmailSuccess = gmailResult?.status === "success";

    let text = `✅ Done! Action execution complete:`;
    let hasAuthError = false;

    if (calendarResult) {
      if (calendarSuccess) {
        text += `\n📅 Scheduled the calendar block. [Open Google Calendar](https://calendar.google.com)`;
      } else {
        text += `\n⚠️ Calendar block failed: ${calendarResult.detail}`;
        if (calendarResult.detail.includes("401") || calendarResult.detail.includes("403") || calendarResult.detail.toLowerCase().includes("unauthorized") || calendarResult.detail.toLowerCase().includes("credentials")) {
          hasAuthError = true;
        }
      }
    }
    if (gmailResult) {
      if (gmailSuccess) {
        text += `\n📧 Created the Gmail draft. [Open Gmail Drafts](https://mail.google.com/mail/#drafts)`;
      } else {
        text += `\n⚠️ Gmail draft failed: ${gmailResult.detail}`;
        if (gmailResult.detail.includes("401") || gmailResult.detail.includes("403") || gmailResult.detail.toLowerCase().includes("unauthorized") || gmailResult.detail.toLowerCase().includes("credentials")) {
          hasAuthError = true;
        }
      }
    }
    text += `\n\nLet's get to work!`;

    if (hasAuthError) {
      setAuthError("Google OAuth session expired. Please sign in again to sync Calendar & Gmail.");
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text
      }
    ]);

    // Update tasks status to scheduled
    if (taskId) {
      setTasks((prev) => {
        return prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: "scheduled"
            };
          }
          return t;
        });
      });

      // Update actions map status to executed
      setActionsMap((prev) => {
        const copy = { ...prev };
        const list = copy[taskId] || [];
        copy[taskId] = list.map((act) => ({
          ...act,
          status: "executed",
          executedAt: new Date()
        }));
        return copy;
      });
    }
  };

  const handleActionDismiss = (index: number) => {
    const msg = messages[index];
    const taskId = msg.taskId;

    setMessages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        dismissed: true
      };
      return copy;
    });

    setMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: "Recommendation dismissed. I've saved the task as pending for you to resolve manually later."
      }
    ]);

    if (taskId) {
      setTasks((prev) => {
        return prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: "pending"
            };
          }
          return t;
        });
      });

      // Update actions map status to rejected
      setActionsMap((prev) => {
        const copy = { ...prev };
        const list = copy[taskId] || [];
        copy[taskId] = list.map((act) => ({
          ...act,
          status: "rejected"
        }));
        return copy;
      });

      // Sync dismissal to Firestore if authenticated and task is not mock
      const currentUser = auth?.currentUser;
      const isMockTask = taskId ? (taskId.startsWith("task-mock-") || taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4") : true;
      if (currentUser && db && db.app && taskId && !isMockTask) {
        try {
          const taskRef = doc(db, "tasks", taskId);
          updateDoc(taskRef, {
            status: "pending",
            agentActions: (actionsMap[taskId] || []).map(act => ({ ...act, status: "rejected" })),
            updatedAt: new Date(),
          }).catch((err) => console.error("Firestore dismissal update error:", err));
        } catch (err) {
          console.error("Firestore dismissal sync setup error:", err);
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden text-text-primary">
      
      {/* Auth Expired Float Alert Warning */}
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-error/10 border border-error/30 p-3 text-xs text-error flex items-center gap-3 backdrop-blur-md shadow-lg">
          <span>⚠️ {authError}</span>
          <button 
            onClick={() => {
              sessionStorage.removeItem("googleAccessToken");
              setAuthError(null);
              window.location.href = "/login";
            }}
            className="bg-error hover:brightness-110 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
          >
            Re-Authorize
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        className="hidden md:flex flex-col justify-between py-5 w-[72px] hover:w-56 overflow-hidden border-r border-white/5 transition-all duration-300 ease-in-out group z-20"
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #131e35 60%, #0f172a 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.35)"
        }}
      >
        {/* TOP: Logo + Nav */}
        <div className="flex flex-col gap-7 w-full">
          {/* Logo Mark */}
          <div className="px-4 flex items-center gap-3">
            <div
              className="relative flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-2xl text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}
            >
              {/* Robot SVG icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="8" width="18" height="13" rx="3" fill="white" fillOpacity="0.9"/>
                <path d="M9 8V6a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="14" r="1.5" fill="#3B82F6"/>
                <circle cx="15" cy="14" r="1.5" fill="#8B5CF6"/>
                <path d="M9 18h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {/* Pulsing dot */}
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#0f172a] animate-pulse" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
              <p className="text-sm font-bold text-white whitespace-nowrap leading-tight">ActionMate</p>
              <p className="text-[10px] text-blue-400 whitespace-nowrap">AI Productivity</p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-white/5" />

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 w-full px-3">
            {[
              {
                id: "dashboard",
                label: "Dashboard",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9"/>
                  </svg>
                )
              },
              {
                id: "tasks",
                label: "Tasks",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )
              },
              {
                id: "logs",
                label: "Agent Logs",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )
              },
              {
                id: "settings",
                label: "Settings",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )
              },
            ].map((item) => {
              const isActive = activeTab === item.id && !selectedTask;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedTask(null);
                  }}
                  className="relative flex items-center gap-3.5 w-full text-left rounded-xl transition-all duration-200 group/btn"
                  style={{
                    padding: "10px 12px",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.2) 100%)"
                      : "transparent",
                    boxShadow: isActive ? "inset 0 0 0 1px rgba(139,92,246,0.3), 0 4px 12px rgba(59,130,246,0.1)" : "none",
                    color: isActive ? "#fff" : "#64748B",
                  }}
                >
                  {/* Active left bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: "linear-gradient(180deg, #3B82F6, #8B5CF6)" }}
                    />
                  )}
                  {/* Icon */}
                  <span
                    className="flex-shrink-0 transition-all duration-200"
                    style={{
                      color: isActive ? "#93c5fd" : "inherit",
                      filter: isActive ? "drop-shadow(0 0 6px rgba(139,92,246,0.6))" : "none",
                    }}
                  >
                    {item.icon}
                  </span>
                  {/* Label */}
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold text-sm whitespace-nowrap"
                    style={{ color: isActive ? "#e2e8f0" : "#94a3b8" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM: User Profile */}
        <div className="px-3">
          {/* Divider */}
          <div className="mb-4 h-px bg-white/5" />
          <div
            className="flex items-center gap-3 w-full rounded-xl p-2 cursor-pointer transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.03)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          >
            <div className="relative flex-shrink-0">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
              >
                N
              </div>
              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#0f172a]" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-0">
              <p className="text-xs font-semibold text-white whitespace-nowrap">Aryan Mehta</p>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">Pro Plan · Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.4)"
        }}
      >
        <div className="flex justify-around items-center h-16 px-2">
          {[
            {
              id: "dashboard", label: "Home",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" fillOpacity="0.9"/></svg>
            },
            {
              id: "tasks", label: "Tasks",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            },
            {
              id: "logs", label: "Logs",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            },
            {
              id: "settings", label: "Settings",
              icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2"/></svg>
            },
          ].map((item) => {
            const isActive = activeTab === item.id && !selectedTask;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedTask(null);
                }}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200"
                style={{ color: isActive ? "#93c5fd" : "#475569" }}
              >
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ background: "linear-gradient(90deg, #3B82F6, #8B5CF6)" }}
                  />
                )}
                <span style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(147,197,253,0.6))" : "none" }}>
                  {item.icon}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? "#93c5fd" : "#475569" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        
        {/* CENTER CONTENT */}
        <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          
          {loading ? (
            <SkeletonLoader variant="task" count={4} />
          ) : selectedTask ? (
            // TASK DETAIL SIDE SHEET ROUTE SPEC
            <div className="space-y-6 animate-fade-in pb-10">
              <div className="flex items-center justify-between pb-4 border-b border-border/50">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="text-text-muted hover:text-text-primary text-xs font-semibold flex items-center gap-1.5"
                >
                  ← Back to Dashboard
                </button>
                <div className="flex gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    selectedTask.priority === "high" ? "bg-error/15 text-error" : selectedTask.priority === "medium" ? "bg-warning/15 text-warning" : "bg-text-muted/15 text-text-muted"
                  }`}>
                    {selectedTask.priority}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-bg-surface border border-border/40 text-text-primary">
                    {selectedTask.status}
                  </span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">{selectedTask.title}</h2>
                <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5">
                  <span>📅</span> Due: {selectedTask.deadlineText}
                </p>
              </div>

              {/* SubtaskList checkable list */}
              <SubtaskList 
                subtasks={subtasksMap[selectedTask.id] || []}
                onToggleSubtask={handleToggleSubtask}
              />

              {/* Timeline Agent Log */}
              <AgentActivityLog 
                actions={actionsMap[selectedTask.id] || []}
              />

            </div>
          ) : activeTab === "dashboard" ? (
            // DASHBOARD ROUTE SPEC
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Today's Focus</h1>
                  <p className="text-text-muted text-sm mt-1">Ready to manage and complete your commitments.</p>
                </div>
                <button 
                  onClick={() => {
                    setChatOpen(true);
                    setInputText("");
                    setMessages((prev) => [
                      ...prev,
                      {
                        sender: "ai",
                        text: "Sure! 📝 Tell me about the new task you'd like to create. Include details like the subject, deadline, or any specific requirements — I'll break it down and set it up for you."
                      }
                    ]);
                  }}
                  className="bg-accent-primary hover:brightness-110 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-all duration-200"
                >
                  <span>+</span> Add Task
                </button>
              </div>

              {/* Conflict detected Alert Banner */}
              <ConflictBanner 
                message="Deadline conflict in 6 hrs"
                details="DBMS Assignment vs. Client Presentation at 5:00 PM."
                onResolve={() => {
                  setChatOpen(true);
                  setInputText("Resolve DBMS Assignment vs Client Presentation conflict");
                }}
              />

              {/* Lanes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* High Lane */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-error uppercase">
                    <span className="h-2 w-2 rounded-full bg-error animate-pulse" /> High Priority
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.priority === "high").map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="p-4 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-36 cursor-pointer"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-base line-clamp-1">{task.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              task.status === "scheduled" ? "bg-success/10 text-success" : task.status === "completed" ? "bg-success/15 text-success border border-success/30" : "bg-accent-ai/10 text-accent-ai"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-1">{task.deadlineText}</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-text-muted">
                            <span>Progress</span>
                            <span>{task.completedSubtasksCount}/{task.subtasksCount} subtasks</span>
                          </div>
                          <div className="h-1.5 w-full bg-bg-raised rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent-primary" 
                              style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medium Lane */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-warning uppercase">
                    <span className="h-2 w-2 rounded-full bg-warning" /> Medium Priority
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.priority === "medium").map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="p-4 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-36 cursor-pointer"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-base line-clamp-1">{task.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              task.status === "completed" ? "bg-success/15 text-success border border-success/30" : "bg-warning/10 text-warning"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-1">{task.deadlineText}</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-text-muted">
                            <span>Progress</span>
                            <span>{task.completedSubtasksCount}/{task.subtasksCount} subtasks</span>
                          </div>
                          <div className="h-1.5 w-full bg-bg-raised rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-success" 
                              style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Low Lane */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-sm tracking-wide text-text-muted uppercase">
                    <span className="h-2 w-2 rounded-full bg-text-muted" /> Low Priority
                  </div>
                  <div className="space-y-3">
                    {tasks.filter(t => t.priority === "low").map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="p-4 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-36 cursor-pointer"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-base line-clamp-1">{task.title}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-warning/10 text-warning">
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted mt-1">{task.deadlineText}</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-text-muted">
                            <span>Progress</span>
                            <span>{task.completedSubtasksCount}/{task.subtasksCount} subtasks</span>
                          </div>
                          <div className="h-1.5 w-full bg-bg-raised rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-warning" 
                              style={{ width: `${(task.completedSubtasksCount / task.subtasksCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
              </div>

              {/* Upcoming Timeline */}
              <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                <h3 className="font-bold text-lg">Upcoming Timeline</h3>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {[
                    { day: "Mon", load: "low", count: 1 },
                    { day: "Tue", load: "medium", count: 2 },
                    { day: "Wed", load: "high", count: 4 },
                    { day: "Thu", load: "free", count: 0 },
                    { day: "Fri", load: "medium", count: 2 },
                    { day: "Sat", load: "free", count: 0 },
                    { day: "Sun", load: "low", count: 1 }
                  ].map((t, i) => (
                    <div key={i} className="flex flex-col items-center py-3 rounded-xl hover:bg-bg-raised transition-colors duration-250 cursor-pointer">
                      <span className="text-xs font-bold text-text-muted">{t.day}</span>
                      <div className="h-10 flex items-center justify-center mt-2">
                        {t.load === "free" && <span className="h-1.5 w-1.5 rounded-full bg-border" />}
                        {t.load === "low" && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                        {t.load === "medium" && (
                          <div className="flex gap-0.5">
                            <span className="h-2 w-2 rounded-full bg-warning" />
                            <span className="h-2 w-2 rounded-full bg-warning" />
                          </div>
                        )}
                        {t.load === "high" && (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex gap-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-error" />
                              <span className="h-1.5 w-1.5 rounded-full bg-error" />
                            </div>
                            <div className="flex gap-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-error" />
                              <span className="h-1.5 w-1.5 rounded-full bg-error" />
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted mt-1">{t.count} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : activeTab === "tasks" ? (
            // TASKS ROUTE SPEC
            <div className="space-y-6 animate-fade-in">
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
                        text: "Sure! 📝 Tell me about the new task you'd like to create. Include details like the subject, deadline, or any specific requirements — I'll break it down and set it up for you."
                      }
                    ]);
                  }}
                  className="bg-accent-primary hover:brightness-110 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg transition-all duration-200"
                >
                  <span>+</span> New Task
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                <div className="divide-y divide-border/50">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-text-muted italic text-center py-6">No tasks available. Use the assistant on the right to create one.</p>
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
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            task.priority === "high" ? "bg-error/15 text-error" : task.priority === "medium" ? "bg-warning/15 text-warning" : "bg-text-muted/15 text-text-muted"
                          }`}>
                            {task.priority}
                          </span>
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            task.status === "completed" ? "bg-success/15 text-success" : task.status === "scheduled" ? "bg-success/10 text-success" : "bg-accent-ai/10 text-accent-ai"
                          }`}>
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
          ) : activeTab === "logs" ? (
            // LOGS ROUTE SPEC
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Agent Activity Logs</h1>
                <p className="text-text-muted text-sm mt-1">Audit trail of all autonomous checks, calendar blocks, and drafts.</p>
              </div>

              <div className="rounded-2xl border border-border bg-bg-surface p-6">
                {(() => {
                  const allActions = Object.entries(actionsMap).flatMap(([taskId, list]) => {
                    const task = tasks.find(t => t.id === taskId);
                    return list.map(act => ({
                      ...act,
                      taskTitle: task?.title || "System Process"
                    }));
                  });

                  if (allActions.length === 0) {
                    return <p className="text-sm text-text-muted italic text-center py-8">No activity logs recorded yet.</p>;
                  }

                  return (
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
                            <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-surface ${statusColor} shadow-sm`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-text-muted text-[10px]">
                                  {action.executedAt ? new Date(action.executedAt).toLocaleTimeString() : "Pending"}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  isCompleted ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                                }`}>
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
                  );
                })()}
              </div>
            </div>
          ) : (
            // SETTINGS ROUTE SPEC
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">System Settings & Status</h1>
                <p className="text-text-muted text-sm mt-1">Configure integrations and check connection health.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">System Health</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2.5 border-b border-border/30">
                      <span className="text-xs text-text-muted font-medium">Integration Mode</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        mounted && sessionStorage.getItem("googleAccessToken") === "mock-sandbox-token"
                          ? "bg-accent-ai/10 text-accent-ai" 
                          : "bg-success/15 text-success"
                      }`}>
                        {mounted && sessionStorage.getItem("googleAccessToken") === "mock-sandbox-token"
                          ? "Simulated Sandbox" 
                          : "Live OAuth Sync"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-border/30">
                      <span className="text-xs text-text-muted font-medium">Gemini 1.5 Pro</span>
                      <span className="text-xs text-success flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-border/30">
                      <span className="text-xs text-text-muted font-medium">Google Calendar Sync</span>
                      <span className="text-xs text-success flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-xs text-text-muted font-medium">Gmail Composer</span>
                      <span className="text-xs text-success flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                  <h3 className="text-lg font-bold text-text-primary">OAuth Sessions</h3>
                  <p className="text-xs text-text-muted font-medium">Manage active access sessions to Google Workspace APIs.</p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase">OAuth Token</span>
                      <div className="p-2.5 rounded-lg bg-bg-base border border-border/50 text-[10px] font-mono text-text-primary truncate">
                        {mounted ? sessionStorage.getItem("googleAccessToken") || "No Token Present (Logged Out)" : "Prerendering..."}
                      </div>
                    </div>
                    {mounted && sessionStorage.getItem("googleAccessToken") === "mock-sandbox-token" ? (
                      <div className="rounded-lg bg-accent-ai/10 border border-accent-ai/20 p-3.5 text-xs text-accent-ai leading-relaxed">
                        ℹ️ You are in <strong>Simulated Sandbox Mode</strong>. To connect your live Google account, configure the credentials inside your <code>.env.local</code> file and sign in.
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          sessionStorage.removeItem("googleAccessToken");
                          window.location.href = "/login";
                        }}
                        className="w-full bg-error hover:brightness-110 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md"
                      >
                        Disconnect & Logout
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </section>

        {/* CHAT PANEL */}
        <aside 
          className={`fixed inset-y-0 right-0 z-20 w-full border-l border-white/5 flex flex-col transform md:relative md:translate-x-0 ${
            isResizing ? "" : "transition-all duration-300"
          } ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
          style={{
            width: mounted && window.innerWidth >= 768 ? `${chatWidth}px` : "100%",
            maxWidth: mounted && window.innerWidth >= 768 ? "none" : "384px",
            background: "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(20,30,55,0.95) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.3)"
          }}
        >
          {/* Resizer Handle */}
          <div
            onMouseDown={startResizing}
            className={`hidden md:block absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-accent-primary/40 transition-colors z-30 ${
              isResizing ? "bg-accent-primary" : "bg-transparent"
            }`}
          />
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">ActionMate AI Agent</h3>
                <p className="text-[10px] text-blue-400 font-medium">Always ready to act</p>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="md:hidden text-text-muted hover:text-white text-lg p-1 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Conversation history area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in w-full`}>
                <div className={`${
                  msg.actions && !msg.executed && !msg.dismissed ? "w-full max-w-full" : "max-w-[85%]"
                } rounded-2xl p-3.5 text-sm ${
                  msg.sender === "user"
                    ? "text-white rounded-tr-none shadow-lg"
                    : "bg-white/[0.03] border border-white/5 text-text-primary rounded-tl-none"
                }`}
                style={msg.sender === "user" ? {
                  background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                  boxShadow: "0 4px 14px rgba(139,92,246,0.25)"
                } : undefined}
                >
                  <p className="leading-relaxed">{renderMessageText(msg.text)}</p>
                  
                  {/* ActionCard integration inside AI response */}
                  {msg.actions && !msg.executed && !msg.dismissed && (
                    <div className="mt-4">
                      <AgentActionCard
                        pendingActions={msg.actions}
                        taskId={msg.taskId || ""}
                        onSuccess={(results) => handleActionSuccess(i, results)}
                        onDismiss={() => handleActionDismiss(i)}
                      />
                    </div>
                  )}
                  {msg.actions && msg.executed && (
                    <div className="mt-4 text-xs text-green-400 font-bold flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                      <span>✓</span> Recommendation Approved & Executed
                    </div>
                  )}
                  {msg.actions && msg.dismissed && (
                    <div className="mt-4 text-xs text-slate-400 font-bold flex items-center gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <span>✕</span> Recommendation Dismissed
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Narrated Status Loading Indicator */}
            {loadingText && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl rounded-tl-none p-3.5 text-xs text-blue-400 flex items-center gap-2.5 shadow-inner">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                  </span>
                  <span className="font-semibold">{loadingText}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions area */}
          <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-white/[0.01] border-t border-white/5">
            {[
              { label: "📅 Sync Calendar", prompt: "Sync my calendar events for tomorrow" },
              { label: "📨 Extension Email", prompt: "Draft an extension request email to Prof. Sharma" },
              { label: "🔍 Check Conflicts", prompt: "Check for any scheduling conflicts today" }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(chip.prompt)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat panel bottom input bar */}
          <div className="p-4 border-t border-white/5 bg-white/[0.02] backdrop-blur-md">
            <div className="flex gap-2 items-center bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/5 focus-within:border-blue-500/50 focus-within:bg-white/[0.05] transition-all">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask ActionMate..."
                rows={1}
                className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-20"
              />
              <button 
                onClick={handleSendMessage}
                className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  inputText.trim() 
                    ? "bg-gradient-to-tr from-blue-600 to-violet-600 text-white shadow-md hover:brightness-110" 
                    : "text-slate-500 hover:text-white"
                }`}
              >
                {inputText.trim() ? (
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.42 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* FLOATING ACTION CHAT FAB FOR MOBILE */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`md:hidden fixed bottom-20 right-4 z-10 p-4 rounded-full bg-gradient-to-tr from-accent-primary to-accent-ai text-white shadow-xl flex items-center justify-center transition-all ${
            chatOpen ? "scale-0" : "scale-100"
          }`}
        >
          <span className="text-xl">💬</span>
        </button>
      </main>

    </div>
  );
}
