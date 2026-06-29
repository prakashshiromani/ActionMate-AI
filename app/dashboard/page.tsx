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
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, deleteField, serverTimestamp } from "firebase/firestore";

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

interface SettingsState {
  automationMode: "copilot" | "autopilot";
  responseStyle: "concise" | "detailed";
  proactiveNudges: boolean;
  workHours: {
    start: string;
    end: string;
    days: string[];
  };
  timezone: string;
  meetingDuration: number;
  taskPriority: "high" | "medium" | "low";
  googleCalendar: {
    connected: boolean;
    lastSync: string | null;
  };
  gmail: {
    connected: boolean;
    lastSync: string | null;
  };
  notifications: {
    inApp: boolean;
    email: boolean;
    quietHours: {
      start: string;
      end: string;
    };
    reminderFrequency: number;
  };
  syncPreferences: {
    calendar: number;
    gmail: number;
  };
}

const defaultSettings: SettingsState = {
  automationMode: "copilot",
  responseStyle: "concise",
  proactiveNudges: true,
  workHours: {
    start: "09:00",
    end: "18:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"]
  },
  timezone: "Asia/Kolkata",
  meetingDuration: 30,
  taskPriority: "medium",
  googleCalendar: {
    connected: false,
    lastSync: null
  },
  gmail: {
    connected: false,
    lastSync: null
  },
  notifications: {
    inApp: true,
    email: true,
    quietHours: {
      start: "22:00",
      end: "07:00"
    },
    reminderFrequency: 15
  },
  syncPreferences: {
    calendar: 900000,
    gmail: 900000
  }
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(true); // Toggle chat panel on mobile
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "ai" | "integrations" | "notifications" | "logs">("general");
  const [settingsState, setSettingsState] = useState<SettingsState>(defaultSettings);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hey! Aryan here, ready to resolve your tasks. What's on your plate today?" }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true); // default dark

  useEffect(() => {
    setMounted(true);
    // Apply saved theme preference on mount
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const dark = saved !== "light"; // default to dark if no preference saved
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("googleConnected") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("🎉 Google Calendar & Gmail connected successfully for silent sync!");
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };


  // Resizable Chat Panel states & logic
  const [chatWidth, setChatWidth] = useState(340);
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
    if (!isLoaded) return;
    const token = sessionStorage.getItem("googleAccessToken");
    if (!token && !isGoogleConnected) {
      setAuthError("Google OAuth session expired. Please sign in again to sync Calendar & Gmail.");
    } else if (token || isGoogleConnected) {
      setAuthError(null);
    }
  }, [isLoaded, isGoogleConnected]);

  const handleConnectSilentSync = () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;
    
    const clientId = "690561405622-mnpgte0fbt7gvi7c3u635dc8u4gap0gn.apps.googleusercontent.com";
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/google-callback");
    const scopes = encodeURIComponent("https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.compose");
    const state = currentUser.uid;

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=select_account%20consent&state=${state}`;
  };

  const handleDisconnectSilentSync = async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser || !db || !db.app) return;
    
    if (confirm("Are you sure you want to disconnect permanent silent calendar sync?")) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, {
          googleConnected: false,
          googleRefreshToken: deleteField(),
          googleAccessToken: deleteField(),
          updatedAt: serverTimestamp()
        });
        sessionStorage.removeItem("googleAccessToken");
      } catch (err) {
        console.error("Failed to disconnect silent sync:", err);
      }
    }
  };

  // Re-authorize Google OAuth inline (popup) without losing dashboard state
  const handleReAuthorize = async () => {
    setReAuthLoading(true);
    try {
      // Sandbox / no-Firebase mode — just use mock token
      if (!auth || !auth.app) {
        sessionStorage.setItem("googleAccessToken", "mock-sandbox-token");
        setAuthError(null);
        setReAuthLoading(false);
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      provider.addScope("https://www.googleapis.com/auth/gmail.compose");
      // Force account selection and consent checkboxes so Google displays permission selection screen
      provider.setCustomParameters({ prompt: "select_account consent" });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const freshAccessToken = credential?.accessToken;

      if (freshAccessToken) {
        sessionStorage.setItem("googleAccessToken", freshAccessToken);
        setAuthError(null);
      } else {
        setAuthError("Re-authorization succeeded but no access token received. Please try again.");
      }
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        console.error("Re-authorization failed:", err);
        setAuthError("Re-authorization failed: " + (err.message || "Unknown error"));
      } else {
        console.warn("Re-authorization cancelled by user.");
      }
    } finally {
      setReAuthLoading(false);
    }
  };



  const [activeConflict, setActiveConflict] = useState<{
    message: string;
    details: string;
    actionPrompt: string;
  } | null>(null);

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
  });  // Fetch real-time tasks & logs from Firestore (if logged in) or LocalStorage (if Sandbox)
  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== "function") {
      setIsLoaded(true);
      return;
    }

    let unsubscribeSettings: (() => void) | null = null;
    let unsubscribeTasks: (() => void) | null = null;
    let safetyTimeout: NodeJS.Timeout | null = null;

    // Safety timeout: If Firestore takes more than 2 seconds to load, fall back to localStorage
    safetyTimeout = setTimeout(() => {
      console.warn("Firestore load timed out. Falling back to local storage cache.");
      const cachedTasks = localStorage.getItem("sandboxTasks");
      const cachedSubtasks = localStorage.getItem("sandboxSubtasks");
      const cachedActions = localStorage.getItem("sandboxActions");
      const cachedSettings = localStorage.getItem("sandboxSettings");

      if (cachedTasks && cachedSubtasks && cachedActions) {
        try {
          setTasks(JSON.parse(cachedTasks));
          setSubtasksMap(JSON.parse(cachedSubtasks));
          setActionsMap(JSON.parse(cachedActions));
        } catch (e) {
          console.error("Failed to parse local tasks cache on timeout:", e);
        }
      }
      if (cachedSettings) {
        try {
          setSettingsState(JSON.parse(cachedSettings));
        } catch (e) {
          console.error("Failed to parse local settings cache on timeout:", e);
        }
      }
      setIsLoaded(true);
      setLoadingText(null);
    }, 2000);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous listeners if any
      if (unsubscribeSettings) {
        unsubscribeSettings();
        unsubscribeSettings = null;
      }
      if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
      }

      if (user && db && db.app) {
        setLoadingText("Fetching your workspace tasks and logs...");
        
        // 1. Settings listener
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeSettings = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const prefs = data?.preferences;
            if (prefs) {
              setSettingsState(prefs);
            }
            setIsGoogleConnected(!!data?.googleRefreshToken);
          }
        }, (err) => {
          console.warn("Settings snapshot listener failed:", err);
        });

        // 2. Tasks listener
        const tasksRef = collection(db, "tasks");
        const q = query(tasksRef, where("userId", "==", user.uid));
        unsubscribeTasks = onSnapshot(q, (querySnapshot) => {
          if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
          }
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
          } else {
            setTasks([]);
            setSubtasksMap({});
            setActionsMap({});
          }
          setIsLoaded(true);
          setLoadingText(null);
        }, (err) => {
          if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
          }
          console.warn("Tasks snapshot listener failed, falling back to local cache:", err);
          
          const cachedTasks = localStorage.getItem("sandboxTasks");
          const cachedSubtasks = localStorage.getItem("sandboxSubtasks");
          const cachedActions = localStorage.getItem("sandboxActions");
          const cachedSettings = localStorage.getItem("sandboxSettings");

          if (cachedTasks && cachedSubtasks && cachedActions) {
            try {
              setTasks(JSON.parse(cachedTasks));
              setSubtasksMap(JSON.parse(cachedSubtasks));
              setActionsMap(JSON.parse(cachedActions));
            } catch (e) {
              console.error("Failed to parse local tasks cache:", e);
            }
          }
          if (cachedSettings) {
            try {
              setSettingsState(JSON.parse(cachedSettings));
            } catch (e) {
              console.error("Failed to parse local settings cache:", e);
            }
          }
          setIsLoaded(true);
          setLoadingText(null);
        });
      } else {
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
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

        const cachedSettings = localStorage.getItem("sandboxSettings");
        if (cachedSettings) {
          try {
            setSettingsState(JSON.parse(cachedSettings));
          } catch (e) {
            console.error("Failed to parse sandbox settings:", e);
          }
        }
        setIsLoaded(true);
        setLoadingText(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
      if (unsubscribeSettings) {
        (unsubscribeSettings as () => void)();
      }
      if (unsubscribeTasks) {
        (unsubscribeTasks as () => void)();
      }
    };
  }, []);

  // Save state to localStorage whenever it changes (Sandbox primary storage & Offline backup cache)
  useEffect(() => {
    if (!isLoaded) return; // Do not save until loading completes

    localStorage.setItem("sandboxTasks", JSON.stringify(tasks));
    localStorage.setItem("sandboxSubtasks", JSON.stringify(subtasksMap));
    localStorage.setItem("sandboxActions", JSON.stringify(actionsMap));
  }, [tasks, subtasksMap, actionsMap, isLoaded]);

  // Auto-save settings to Firestore or LocalStorage when settingsState changes (debounced)
  useEffect(() => {
    if (!mounted) return;
    
    const saveSettings = async () => {
      const token = typeof window !== "undefined" && sessionStorage.getItem("googleAccessToken");
      const isSandbox = !token || token === "mock-sandbox-token" || token === "mock-token-refresh" || token.startsWith("mock-");
      
      if (isSandbox) {
        localStorage.setItem("sandboxSettings", JSON.stringify(settingsState));
        setShowSaveSuccess(true);
        const timer = setTimeout(() => setShowSaveSuccess(false), 2500);
        return () => clearTimeout(timer);
      } else {
        const currentUser = auth?.currentUser;
        if (currentUser && db && db.app) {
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            await setDoc(userDocRef, {
              preferences: settingsState
            }, { merge: true });
            setShowSaveSuccess(true);
            const timer = setTimeout(() => setShowSaveSuccess(false), 2500);
            return () => clearTimeout(timer);
          } catch (e) {
            console.error("Failed to save settings to Firestore:", e);
          }
        }
      }
    };
    
    const debounceSave = setTimeout(() => {
      saveSettings();
    }, 600);
    
    return () => clearTimeout(debounceSave);
  }, [settingsState, mounted]);

  const handleResetToDefaults = () => {
    setSettingsState(defaultSettings);
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this task? This action cannot be undone.");
    if (!confirmed) return;

    try {
      // 1. Remove from local states
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSubtasksMap((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
      setActionsMap((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });

      // 2. Go back to main dashboard
      setSelectedTask(null);

      // 3. Remove from Firestore if authenticated and not a mock task
      const currentUser = auth?.currentUser;
      const isMockTask = taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4";
      if (currentUser && db && db.app && !isMockTask) {
        const taskRef = doc(db, "tasks", taskId);
        await deleteDoc(taskRef);
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task. Please try again.");
    }
  };

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
          <strong key={`${keyPrefix}-bold-${m.index}`} className="font-bold" style={{ color: "var(--text-primary)" }}>
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
          className="underline font-bold"
          style={{ color: "var(--accent-primary)" }}
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
    const isMockTask = taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4";
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
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-google-access-token": googleAccessToken,
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      const response = await fetch("/api/agent/process", {
        method: "POST",
        headers,
        body: JSON.stringify({
          userMessage: userPrompt,
          conversationHistory: newMessages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          })),
          currentDatetime: (() => {
            const d = new Date();
            const offset = -d.getTimezoneOffset();
            const sign = offset >= 0 ? "+" : "-";
            const pad = (num: number) => String(num).padStart(2, "0");
            const hours = pad(Math.floor(Math.abs(offset) / 60));
            const mins = pad(Math.abs(offset) % 60);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hours}:${mins}`;
          })()
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
      
      if (data.conflict) {
        setActiveConflict(data.conflict);
      } else {
        setActiveConflict(null);
      }
      
      // Update UI with real AI response
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai" as const,
          text: settingsState.automationMode === "autopilot"
            ? `${data.agentText}\n\n⚡ **Autopilot Mode Active:** Executing the recommended actions autonomously...`
            : data.agentText,
          actions: data.pendingActions && data.pendingActions.length > 0 ? data.pendingActions : undefined,
          taskId: data.taskId
        }
      ]);

      if (settingsState.automationMode === "autopilot" && data.pendingActions && data.pendingActions.length > 0) {
        setTimeout(() => {
          triggerAutoExecution(data.pendingActions, data.taskId || "", newMessages.length);
        }, 500);
      }

      // If new task was created, add it to lanes dynamically
      if (data.taskId && data.suggestedSubtasks) {
        // Parse simulated deadline from userPrompt
        let apiSimulatedDeadline = "Tomorrow";
        const lowerPrompt = userPrompt.toLowerCase();
        if (lowerPrompt.includes("today")) {
          apiSimulatedDeadline = "Today";
        } else if (lowerPrompt.includes("tomorrow")) {
          apiSimulatedDeadline = "Tomorrow";
        } else if (lowerPrompt.includes("yesterday")) {
          apiSimulatedDeadline = "Yesterday";
        } else {
          const dateMatch = userPrompt.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i);
          if (dateMatch) {
            apiSimulatedDeadline = dateMatch[0];
          }
        }

        const newTask: MockTask = {
          id: data.taskId,
          title: userPrompt.length > 60 ? `${userPrompt.substring(0, 57)}...` : userPrompt,
          priority: ["urgent", "jaldi", "emergency", "important", "deadline", "kal", "cal", "today", "due", "subah", "tomorrow"].some(word => userPrompt.toLowerCase().includes(word)) ? "high" as const : "medium" as const,
          status: settingsState.automationMode === "autopilot" ? "scheduled" as const : (data.pendingActions && data.pendingActions.length > 0 ? "in_progress" as const : "pending" as const),
          deadlineText: apiSimulatedDeadline,
          subtasksCount: data.suggestedSubtasks.length,
          completedSubtasksCount: 0
        };
        setTasks((prev) => {
          if (prev.some(t => t.id === data.taskId)) return prev;
          return [newTask, ...prev];
        });

        // Add subtasks to map
        setSubtasksMap((prev) => {
          if (prev[data.taskId]) return prev;
          return {
            ...prev,
            [data.taskId]: data.suggestedSubtasks.map((st: any, i: number) => ({
              subtaskId: `st-${data.taskId}-${i}`,
              title: st.title,
              estimatedMinutes: st.estimatedMinutes,
              completed: false,
              completedAt: null
            }))
          };
        });

        // Add empty actions history
        setActionsMap((prev) => {
          if (prev[data.taskId]) return prev;
          return {
            ...prev,
            [data.taskId]: data.pendingActions ? data.pendingActions.map((act: any) => ({
              actionType: act.type,
              status: "pending_approval",
              executedAt: null,
              detail: act.displaySummary
            })) : []
          };
        });

        // Sync new task to Firestore if authenticated
        const currentUser = auth?.currentUser;
        if (currentUser && db && db.app) {
          try {
            const taskDocRef = doc(db, "tasks", data.taskId);
            await setDoc(taskDocRef, {
              userId: currentUser.uid,
              taskId: data.taskId,
              title: newTask.title,
              priority: newTask.priority,
              status: newTask.status,
              deadlineText: newTask.deadlineText,
              subtasks: data.suggestedSubtasks.map((st: any, i: number) => ({
                subtaskId: `st-${data.taskId}-${i}`,
                title: st.title,
                estimatedMinutes: st.estimatedMinutes,
                completed: false,
                completedAt: null
              })),
              agentActions: data.pendingActions ? data.pendingActions.map((act: any) => ({
                actionType: act.type,
                status: "pending_approval",
                executedAt: null,
                detail: act.displaySummary
              })) : [],
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to save new task to Firestore:", e);
          }
        }
      }

    } catch (err: any) {
      console.warn("API processing failed:", err);
      clearInterval(cycleTimer);
      setLoadingText(null);

      const token = sessionStorage.getItem("googleAccessToken") || "";
      const isSandbox = token === "mock-sandbox-token" || token === "mock-token-refresh" || token.startsWith("mock-") || !token;

      if (isSandbox) {
        setLoadingText("Simulating agent workflow in sandbox mode...");
        setTimeout(async () => {
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
          const mockActions = [
            {
              type: "CALENDAR_BLOCK" as const,
              payload: {
                title: `Deep Work: ${topic}`,
                start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T10:00:00",
                end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] + "T12:00:00",
                description: `Blocked study slot from ActionMate recommendation for ${topic}`
              },
              displaySummary: `Create calendar event "Deep Work: ${topic}"`
            },
            {
              type: "GMAIL_DRAFT" as const,
              payload: {
                to: "sharma.prof@example.com",
                subject: `Extension Request: ${topic} submission`,
                body: `Dear Prof. Sharma,\n\nI am writing to request a brief 24-hour extension on the ${topic} due tomorrow. Due to scheduling conflicts, I need a bit more time to complete it to standard.\n\nThank you,\nAryan`
              },
              displaySummary: `Draft email to "sharma.prof@example.com" with subject "Extension Request: ${topic}"`
            }
          ];

          setMessages((prev) => [
            ...prev,
            {
              sender: "ai" as const,
              text: settingsState.automationMode === "autopilot"
                ? `I've analyzed your request for **${topic}**.\n\n⚡ **Autopilot Mode Active:** I'm scheduling your deep work slot and drafting the email to **Prof. Sharma** autonomously...`
                : `I've analyzed your request for **${topic}**. \n\nI found a schedule conflict:\n• **Schedule Conflict:** Your calendar is busy tomorrow.\n• **Action Block:** Suggesting a study/deep work slot.\n• **Backup Plan:** Drafted an extension email to **Prof. Sharma** in your Gmail Drafts.\n\nPlease approve the action cards below:`,
              actions: mockActions,
              taskId: mockTaskId
            }
          ]);

          if (settingsState.automationMode === "autopilot") {
            setTimeout(() => {
              triggerAutoExecution(mockActions, mockTaskId, newMessages.length);
            }, 500);
          }

          // Simple parsing of deadline text from userPrompt for realistic sandbox testing
          let simulatedDeadline = "Tomorrow";
          const lowerPrompt = userPrompt.toLowerCase();
          if (lowerPrompt.includes("today")) {
            simulatedDeadline = "Today";
          } else if (lowerPrompt.includes("tomorrow")) {
            simulatedDeadline = "Tomorrow";
          } else if (lowerPrompt.includes("yesterday")) {
            simulatedDeadline = "Yesterday";
          } else {
            const dateMatch = userPrompt.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i);
            if (dateMatch) {
              simulatedDeadline = dateMatch[0];
            }
          }

          // Add subtasks and logs to lists dynamically
          setTasks((prev) => {
            if (prev.some(t => t.id === mockTaskId)) return prev;
            return [
              {
                id: mockTaskId,
                title: userPrompt.length > 60 ? `${userPrompt.substring(0, 57)}...` : userPrompt,
                priority: "high",
                status: settingsState.automationMode === "autopilot" ? "scheduled" as const : "in_progress" as const,
                deadlineText: simulatedDeadline,
                subtasksCount: 3,
                completedSubtasksCount: 0
              },
              ...prev
            ];
          });

          setSubtasksMap((prev) => {
            if (prev[mockTaskId]) return prev;
            return {
              ...prev,
              [mockTaskId]: [
                { subtaskId: `st-mock-${mockTaskId}-1`, title: `Review ${topic} requirements`, estimatedMinutes: 30, completed: false, completedAt: null },
                { subtaskId: `st-mock-${mockTaskId}-2`, title: `Draft core contents for ${topic}`, estimatedMinutes: 45, completed: false, completedAt: null },
                { subtaskId: `st-mock-${mockTaskId}-3`, title: `Verify and review ${topic}`, estimatedMinutes: 30, completed: false, completedAt: null }
              ]
            };
          });

          setActionsMap((prev) => {
            if (prev[mockTaskId]) return prev;
            return {
              ...prev,
              [mockTaskId]: [
                { actionType: "CALENDAR_BLOCK", status: "pending_approval", executedAt: null, detail: `Recommended block: Deep Work: ${topic}` },
                { actionType: "GMAIL_DRAFT", status: "pending_approval", executedAt: null, detail: `Recommended draft: Extension Request: ${topic}` }
              ]
            };
          });

          // Sync simulated sandbox task to Firestore if authenticated
          const currentUser = auth?.currentUser;
          if (currentUser && db && db.app) {
            try {
              const taskDocRef = doc(db, "tasks", mockTaskId);
              await setDoc(taskDocRef, {
                userId: currentUser.uid,
                taskId: mockTaskId,
                title: userPrompt.length > 60 ? `${userPrompt.substring(0, 57)}...` : userPrompt,
                priority: "high",
                status: settingsState.automationMode === "autopilot" ? "scheduled" : "in_progress",
                deadlineText: simulatedDeadline,
                subtasks: [
                  { subtaskId: `st-mock-${mockTaskId}-1`, title: `Review ${topic} requirements`, estimatedMinutes: 30, completed: false, completedAt: null },
                  { subtaskId: `st-mock-${mockTaskId}-2`, title: `Draft core contents for ${topic}`, estimatedMinutes: 45, completed: false, completedAt: null },
                  { subtaskId: `st-mock-${mockTaskId}-3`, title: `Verify and review ${topic}`, estimatedMinutes: 30, completed: false, completedAt: null }
                ],
                agentActions: [
                  { actionType: "CALENDAR_BLOCK", status: "pending_approval", executedAt: null, detail: `Recommended block: Deep Work: ${topic}` },
                  { actionType: "GMAIL_DRAFT", status: "pending_approval", executedAt: null, detail: `Recommended draft: Extension Request: ${topic}` }
                ],
                createdAt: new Date().toISOString()
              });
            } catch (e) {
              console.error("Failed to save sandbox task to Firestore:", e);
            }
          }
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

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const startText = inputText.trim() ? inputText.trim() + " " : "";
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInputText(startText + transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleActionSuccess = async (index: number, results: any[], targetTaskId?: string) => {
    const calendarResult = results.find(r => r.type === "CALENDAR_BLOCK");
    const gmailResult = results.find(r => r.type === "GMAIL_DRAFT");

    const calendarSuccess = calendarResult ? calendarResult.status === "success" : true;
    const gmailSuccess = gmailResult ? gmailResult.status === "success" : true;
    const allSuccess = calendarSuccess && gmailSuccess;

    // Safely update message executed state
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          executed: allSuccess
        };
      }
      return copy;
    });

    let text = `✅ Done! Action execution complete:`;
    let hasAuthError = false;

    if (calendarResult) {
      if (calendarSuccess) {
        text += `\n📅 Scheduled the calendar block. [Open Google Calendar](https://calendar.google.com)`;
        setActiveConflict(null); // Clear conflict banner on successful execution
      } else {
        // Extract clean error message — strip raw JSON noise
        const rawDetail = calendarResult.detail || "";
        let cleanMsg = rawDetail;
        // Try to extract just the meaningful part (before large JSON dump)
        const dashIdx = rawDetail.lastIndexOf(" — ");
        if (dashIdx !== -1) cleanMsg = rawDetail.substring(dashIdx + 3);
        // Truncate at 120 chars
        if (cleanMsg.length > 120) cleanMsg = cleanMsg.substring(0, 117) + "...";
        text += `\n⚠️ Calendar scheduling failed: ${cleanMsg}`;
        if (rawDetail.includes("401") || rawDetail.includes("403") || rawDetail.toLowerCase().includes("unauthorized") || rawDetail.toLowerCase().includes("credentials")) {
          hasAuthError = true;
        }
      }
    }
    if (gmailResult) {
      if (gmailSuccess) {
        text += `\n📧 Created the Gmail draft. [Open Gmail Drafts](https://mail.google.com/mail/#drafts)`;
      } else {
        const rawDetail = gmailResult.detail || "";
        let cleanMsg = rawDetail;
        const dashIdx = rawDetail.lastIndexOf(" — ");
        if (dashIdx !== -1) cleanMsg = rawDetail.substring(dashIdx + 3);
        if (cleanMsg.length > 120) cleanMsg = cleanMsg.substring(0, 117) + "...";
        text += `\n⚠️ Gmail draft failed: ${cleanMsg}`;
        if (rawDetail.includes("401") || rawDetail.includes("403") || rawDetail.toLowerCase().includes("unauthorized") || rawDetail.toLowerCase().includes("credentials")) {
          hasAuthError = true;
        }
      }
    }
    text += `\n\nLet's get to work!`;

    if (hasAuthError) {
      setAuthError("Google OAuth permission missing or expired. Click 'Re-Authorize' and ensure you CHECK the checkboxes for Calendar and Gmail permissions on the Google login screen.");
    } else {
      setAuthError(null); // Clear any old OAuth errors on successful execution!
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "ai" as const,
        text
      }
    ]);

    const taskId = targetTaskId;
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

      // Sync task execution status to Firestore if authenticated
      const currentUser = auth?.currentUser;
      const isMockTask = taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4";
      if (currentUser && db && db.app && !isMockTask) {
        try {
          const taskRef = doc(db, "tasks", taskId);
          const currentActions = actionsMap[taskId] || [];
          const updatedActions = currentActions.map((act) => ({
            ...act,
            status: "executed",
            executedAt: new Date().toISOString()
          }));
          await updateDoc(taskRef, {
            status: "scheduled",
            agentActions: updatedActions,
            updatedAt: new Date()
          });
        } catch (err) {
          console.error("Failed to update task execution state in Firestore:", err);
        }
      }
    }
  };

  const triggerAutoExecution = async (actionsToExec: any[], targetTaskId: string, msgIndex: number) => {
    const googleAccessToken = typeof window !== "undefined" ? sessionStorage.getItem("googleAccessToken") || "" : "";
    const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-google-access-token": googleAccessToken,
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      const response = await fetch("/api/agent/execute", {
        method: "POST",
        headers,
        body: JSON.stringify({
          approvedActions: actionsToExec,
          taskId: targetTaskId,
        }),
      });
      const data = await response.json();
      if (response.ok && data.results) {
        handleActionSuccess(msgIndex, data.results, targetTaskId);
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err: any) {
      console.error("Autopilot execution error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **Autopilot Execution Failed:** ${err.message || "Failed to auto-execute actions."} You can trigger them manually if needed.`
        }
      ]);
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
      const isMockTask = taskId ? (taskId === "1" || taskId === "2" || taskId === "3" || taskId === "4") : true;
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-error/10 border border-error/30 p-3 text-xs text-error flex items-center gap-3 backdrop-blur-md shadow-lg max-w-lg">
          <span>⚠️ {authError}</span>
          <button 
            onClick={handleReAuthorize}
            disabled={reAuthLoading}
            className="bg-error hover:brightness-110 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {reAuthLoading ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in...
              </>
            ) : "Re-Authorize"}
          </button>
          <button 
            onClick={() => setAuthError(null)}
            className="text-error/70 hover:text-error text-xs p-1 font-bold cursor-pointer"
            title="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        className="hidden md:flex flex-col justify-between py-5 w-14 hover:w-56 flex-shrink-0 overflow-hidden border-r transition-all duration-300 ease-in-out group z-20"
        style={{
          background: isDark
            ? "linear-gradient(180deg, #0f172a 0%, #131e35 60%, #0f172a 100%)"
            : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)",
          backdropFilter: "blur(20px)",
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
          boxShadow: isDark
            ? "inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 24px rgba(0,0,0,0.35)"
            : "inset -1px 0 0 rgba(0,0,0,0.05), 4px 0 24px rgba(0,0,0,0.06)"
        }}
      >
        {/* TOP: Logo + Nav */}
        <div className="flex flex-col gap-7 w-full">
          {/* Logo Mark */}
          <div className="px-2 group-hover:px-4 flex items-center justify-center group-hover:justify-start gap-3 w-full">
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
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 animate-pulse" style={{ borderColor: "var(--bg-base)" }} />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
              <p className="text-sm font-bold text-text-primary whitespace-nowrap leading-tight">ActionMate</p>
              <p className="text-[10px] text-blue-400 whitespace-nowrap">AI Productivity</p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px" style={{ background: "var(--border)", opacity: 0.3 }} />

          {/* Nav Items */}
          <nav className="flex flex-col gap-1 w-full px-2 group-hover:px-3">
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
                id: "calendar",
                label: "Calendar",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                    <circle cx="7" cy="14" r="1" fill="currentColor" />
                    <circle cx="12" cy="14" r="1" fill="currentColor" />
                    <circle cx="17" cy="14" r="1" fill="currentColor" />
                    <circle cx="7" cy="18" r="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                    <circle cx="17" cy="18" r="1" fill="currentColor" />
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
                  className="relative flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3.5 w-full text-left rounded-xl transition-all duration-200 group/btn px-2.5 group-hover:px-3 py-2.5"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 100%)"
                      : "transparent",
                    boxShadow: isActive ? "inset 0 0 0 1px rgba(139,92,246,0.2), 0 4px 12px rgba(59,130,246,0.05)" : "none",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
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
                      color: isActive ? "var(--accent-primary)" : "inherit",
                      filter: isActive ? "drop-shadow(0 0 4px rgba(139,92,246,0.4))" : "none",
                    }}
                  >
                    {item.icon}
                  </span>
                  {/* Label */}
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold text-sm whitespace-nowrap overflow-hidden w-0 group-hover:w-auto"
                    style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM: Theme Toggle + User Profile */}
        <div className="px-2 group-hover:px-3 flex flex-col gap-2">
          {/* Divider */}
          <div className="mb-1 h-px" style={{ background: "var(--border)", opacity: 0.3 }} />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="relative flex items-center justify-center group-hover:justify-start gap-0 group-hover:gap-3.5 w-full text-left rounded-xl transition-all duration-200 px-2.5 group-hover:px-3 py-2.5"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)")}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)")}
          >
            {/* Icon: Moon or Sun */}
            <span className="flex-shrink-0" style={{ color: isDark ? "#93c5fd" : "#F59E0B" }}>
              {isDark ? (
                /* Moon icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              ) : (
                /* Sun icon */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>

            {/* Label - only visible when sidebar expanded */}
            <span
              className="opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold text-sm whitespace-nowrap w-0 overflow-hidden group-hover:w-auto group-hover:flex-1"
              style={{ color: "var(--text-muted)" }}
            >
              {isDark ? "Dark Mode" : "Light Mode"}
            </span>

            {/* Pill Toggle */}
            <span
              className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 w-0 overflow-hidden group-hover:w-auto"
            >
              <span
                className="flex items-center rounded-full p-0.5 transition-all duration-300"
                style={{
                  width: "32px",
                  height: "18px",
                  background: isDark ? "rgba(59,130,246,0.4)" : "rgba(245,158,11,0.4)",
                  border: `1px solid ${isDark ? "rgba(59,130,246,0.5)" : "rgba(245,158,11,0.5)"}`,
                  justifyContent: isDark ? "flex-start" : "flex-end"
                }}
              >
                <span
                  className="rounded-full shadow-sm"
                  style={{
                    width: "12px",
                    height: "12px",
                    background: isDark ? "#93c5fd" : "#F59E0B",
                  }}
                />
              </span>
            </span>
          </button>

          {/* User Profile */}
          <div
            className="flex items-center justify-between group-hover:justify-start gap-0 group-hover:gap-3 w-full rounded-xl p-1 group-hover:p-2 cursor-pointer transition-all duration-200 mb-2"
            style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)")}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shadow-md"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
                >
                  {(auth?.currentUser?.displayName || auth?.currentUser?.email || "Aryan Mehta").charAt(0).toUpperCase()}
                </div>
                {/* Online dot */}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2" style={{ borderColor: "var(--bg-base)" }} />
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 min-w-0 w-0 overflow-hidden group-hover:w-auto">
                <p className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "var(--text-primary)", maxWidth: "100px" }}>
                  {auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "Aryan Mehta"}
                </p>
                <p className="text-[10px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Pro Plan · Active</p>
              </div>
            </div>
            {auth?.currentUser && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm("Are you sure you want to sign out of ActionMate?")) {
                    try {
                      const { signOut } = await import("firebase/auth");
                      await signOut(auth);
                      sessionStorage.clear();
                      localStorage.removeItem("sandboxTasks");
                      localStorage.removeItem("sandboxSubtasks");
                      localStorage.removeItem("sandboxActions");
                      localStorage.removeItem("sandboxSettings");
                      window.location.href = "/login";
                    } catch (err) {
                      console.error("Sign out failed:", err);
                    }
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-error/10 text-text-muted hover:text-error rounded-lg transition-colors ml-auto hidden group-hover:block shrink-0"
                title="Sign Out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20"
        style={{
          background: isDark ? "rgba(15,23,42,0.95)" : "rgba(248,250,252,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
          boxShadow: isDark ? "0 -8px 32px rgba(0,0,0,0.4)" : "0 -8px 32px rgba(0,0,0,0.08)"
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
              id: "calendar", label: "Calendar",
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="7" cy="14" r="1" fill="currentColor" />
                  <circle cx="12" cy="14" r="1" fill="currentColor" />
                  <circle cx="17" cy="14" r="1" fill="currentColor" />
                  <circle cx="7" cy="18" r="1" fill="currentColor" />
                  <circle cx="12" cy="18" r="1" fill="currentColor" />
                  <circle cx="17" cy="18" r="1" fill="currentColor" />
                </svg>
              )
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="text-error bg-error/5 hover:bg-error/10 hover:border-error/20 border border-transparent px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    🗑️ Delete Task
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
                  <h1 className="text-2xl font-extrabold tracking-tight">Today's Focus</h1>
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
              {activeConflict ? (
                <ConflictBanner 
                  key={activeConflict.details}
                  message={activeConflict.message}
                  details={activeConflict.details}
                  onResolve={() => {
                    setChatOpen(true);
                    setInputText(activeConflict.actionPrompt);
                    setActiveConflict(null);
                  }}
                />
              ) : (
                tasks.some(t => t.title.toLowerCase().includes("dbms") && t.status !== "completed") && 
                tasks.some(t => (t.title.toLowerCase().includes("presentation") || t.title.toLowerCase().includes("client")) && t.status !== "completed") && (
                  <ConflictBanner 
                    message="Deadline conflict in 6 hrs"
                    details="DBMS Assignment vs. Client Presentation at 5:00 PM."
                    onResolve={() => {
                      setChatOpen(true);
                      setInputText("Resolve DBMS Assignment vs Client Presentation conflict");
                    }}
                  />
                )
              )}

              {/* Lanes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
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
                        className="p-3 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-32 cursor-pointer"
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
                        className="p-3 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-32 cursor-pointer"
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
                        className="p-3 rounded-xl border border-border bg-bg-surface hover:border-accent-primary/20 hover:bg-bg-raised transition-all duration-150 shadow-sm flex flex-col justify-between h-32 cursor-pointer"
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

              {/* Upcoming Timeline — dynamic from tasks state */}
              {(() => {
                // Build Mon–Sun columns for the current week
                const now = mounted ? new Date() : new Date(0);
                // Monday = 0 offset
                const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const monday = new Date(now);
                monday.setDate(now.getDate() + mondayOffset);
                monday.setHours(0, 0, 0, 0);

                const weekDays = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(monday);
                  d.setDate(monday.getDate() + i);
                  return d;
                });

                const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

                // Parse deadlineText into a Date (best-effort)
                const parseDeadline = (text: string): Date | null => {
                  if (!text) return null;
                  const lower = text.toLowerCase();
                  const base = new Date(now);
                  base.setHours(23, 59, 0, 0);

                  if (lower.startsWith("today")) return base;
                  if (lower.startsWith("yesterday")) {
                    const d = new Date(base);
                    d.setDate(d.getDate() - 1);
                    return d;
                  }
                  if (lower.startsWith("tomorrow")) {
                    const d = new Date(base);
                    d.setDate(d.getDate() + 1);
                    return d;
                  }
                  // Try native parse — handles "June 29, 2:00 PM" etc.
                  const parsed = new Date(text);
                  if (!isNaN(parsed.getTime())) return parsed;
                  return null;
                };

                // Count non-completed tasks per weekday column
                const counts = weekDays.map((wd) => {
                  const wd0 = new Date(wd); wd0.setHours(0, 0, 0, 0);
                  const wd1 = new Date(wd); wd1.setHours(23, 59, 59, 999);
                  return tasks.filter((t) => {
                    if (t.status === "completed") return false;
                    const d = parseDeadline(t.deadlineText);
                    return d && d >= wd0 && d <= wd1;
                  }).length;
                });

                const getLoad = (count: number) => {
                  if (count === 0) return "free";
                  if (count === 1) return "low";
                  if (count <= 2) return "medium";
                  return "high";
                };

                const todayIdx = (() => {
                  const t = new Date(now); t.setHours(0,0,0,0);
                  return weekDays.findIndex(d => d.getTime() === t.getTime());
                })();

                return (
                  <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">Upcoming Timeline</h3>
                      <span className="text-[10px] text-text-muted font-mono">
                        {mounted ? `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {weekDays.map((wd, i) => {
                        const count = counts[i];
                        const load = getLoad(count);
                        const isToday = i === todayIdx;
                        return (
                          <div
                            key={i}
                            className="flex flex-col items-center py-3 rounded-xl hover:bg-bg-raised transition-colors duration-250 cursor-pointer"
                            style={isToday ? { background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" } : {}}
                          >
                            <span className={`text-xs font-bold ${isToday ? "text-accent-primary" : "text-text-muted"}`}>
                              {DAY_LABELS[i]}
                            </span>
                            {isToday && <span className="text-[9px] text-accent-primary font-bold mt-0.5">Today</span>}
                            <div className="h-10 flex items-center justify-center mt-1">
                              {load === "free" && <span className="h-1.5 w-1.5 rounded-full bg-border" />}
                              {load === "low" && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                              {load === "medium" && (
                                <div className="flex gap-0.5">
                                  <span className="h-2 w-2 rounded-full bg-warning" />
                                  <span className="h-2 w-2 rounded-full bg-warning" />
                                </div>
                              )}
                              {load === "high" && (
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
                            <span className="text-[10px] text-text-muted mt-1">{count} task{count !== 1 ? "s" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
          ) : activeTab === "calendar" ? (
            // CALENDAR ROUTE SPEC
            <div className="space-y-6 animate-fade-in pb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Calendar</h1>
                  <p className="text-text-muted text-sm mt-1">View your monthly commitments and deadlines.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="bg-bg-surface hover:bg-bg-raised text-text-primary border border-border px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Today
                  </button>
                  <div className="flex items-center bg-bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                      className="px-3 py-1.5 hover:bg-bg-raised text-text-primary text-xs font-bold transition border-r border-border"
                    >
                      ←
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold text-text-primary min-w-[120px] text-center">
                      {calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                      className="px-3 py-1.5 hover:bg-bg-raised text-text-primary text-xs font-bold transition border-l border-border"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              {(() => {
                const year = calendarDate.getFullYear();
                const month = calendarDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // start on Monday
                const totalDays = new Date(year, month + 1, 0).getDate();
                const prevTotalDays = new Date(year, month, 0).getDate();

                const cells: { date: Date; isCurrentMonth: boolean }[] = [];

                // Prev month padding
                for (let i = offset - 1; i >= 0; i--) {
                  cells.push({
                    date: new Date(year, month - 1, prevTotalDays - i),
                    isCurrentMonth: false
                  });
                }

                // Current month days
                for (let i = 1; i <= totalDays; i++) {
                  cells.push({
                    date: new Date(year, month, i),
                    isCurrentMonth: true
                  });
                }

                // Next month padding to standard 42 cell grid
                const remaining = 42 - cells.length;
                for (let i = 1; i <= remaining; i++) {
                  cells.push({
                    date: new Date(year, month + 1, i),
                    isCurrentMonth: false
                  });
                }

                const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Helper to parse deadline (same logic as timeline)
                const parseDeadline = (text: string): Date | null => {
                  if (!text) return null;
                  const lower = text.toLowerCase();
                  const base = new Date();
                  base.setHours(23, 59, 0, 0);

                  if (lower.startsWith("today")) return base;
                  if (lower.startsWith("yesterday")) {
                    const d = new Date(base);
                    d.setDate(d.getDate() - 1);
                    return d;
                  }
                  if (lower.startsWith("tomorrow")) {
                    const d = new Date(base);
                    d.setDate(d.getDate() + 1);
                    return d;
                  }
                  const parsed = new Date(text);
                  if (!isNaN(parsed.getTime())) return parsed;
                  return null;
                };

                const getTasksForDate = (date: Date) => {
                  const d0 = new Date(date); d0.setHours(0, 0, 0, 0);
                  const d1 = new Date(date); d1.setHours(23, 59, 59, 999);
                  return tasks.filter((t) => {
                    if (t.status === "completed") return false;
                    const deadlineDate = parseDeadline(t.deadlineText);
                    return deadlineDate && deadlineDate >= d0 && deadlineDate <= d1;
                  });
                };

                const selectedDayTasks = selectedCalendarDate ? getTasksForDate(selectedCalendarDate) : [];

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Calendar grid wrapper */}
                    <div className="lg:col-span-3 rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      {/* Week headers */}
                      <div className="grid grid-cols-7 gap-2">
                        {DAY_LABELS.map((day, idx) => (
                          <span key={idx} className="text-xs font-bold text-text-muted text-center py-2">
                            {day}
                          </span>
                        ))}
                      </div>

                      {/* Day cells grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {cells.map((cell, idx) => {
                          const dateTasks = getTasksForDate(cell.date);
                          const cellTime = new Date(cell.date); cellTime.setHours(0,0,0,0);
                          const isToday = cellTime.getTime() === today.getTime();
                          const isSelected = selectedCalendarDate && cellTime.getTime() === new Date(selectedCalendarDate).setHours(0,0,0,0);

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedCalendarDate(cell.date)}
                              className={`aspect-square p-2 rounded-xl flex flex-col justify-between cursor-pointer transition border hover:bg-bg-raised/50 ${
                                isSelected 
                                  ? "border-accent-primary bg-accent-primary/5 shadow-[0_0_12px_rgba(59,130,246,0.15)]" 
                                  : isToday 
                                    ? "border-accent-primary/30 bg-accent-primary/5" 
                                    : "border-border/40"
                              } ${
                                cell.isCurrentMonth ? "text-text-primary" : "text-text-muted opacity-40"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className={`text-xs font-bold ${isToday ? "text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded-md" : ""}`}>
                                  {cell.date.getDate()}
                                </span>
                                {dateTasks.length > 0 && (
                                  <span className="text-[9px] px-1 bg-border/50 rounded text-text-muted font-mono font-bold">
                                    {dateTasks.length}
                                  </span>
                                )}
                              </div>

                              {/* Task Priority Indicator dots */}
                              {dateTasks.length > 0 && (
                                <div className="flex gap-1 flex-wrap overflow-hidden h-4 items-center">
                                  {dateTasks.slice(0, 3).map((t, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        t.priority === "high" ? "bg-error" : t.priority === "medium" ? "bg-warning" : "bg-text-muted"
                                      }`}
                                      title={t.title}
                                    />
                                  ))}
                                  {dateTasks.length > 3 && (
                                    <span className="text-[7px] text-text-muted font-bold font-mono">
                                      +{dateTasks.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Day Details Panel */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4 h-fit flex flex-col">
                      <div className="border-b border-border/50 pb-3">
                        <h3 className="font-bold text-base">Day Details</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          {selectedCalendarDate 
                            ? selectedCalendarDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                            : "Select a date to view tasks"
                          }
                        </p>
                      </div>

                      {selectedCalendarDate ? (
                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px]">
                          {selectedDayTasks.length === 0 ? (
                            <p className="text-xs text-text-muted italic py-4 text-center">No tasks scheduled for this day.</p>
                          ) : (
                            selectedDayTasks.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => setSelectedTask(t)}
                                className="p-3 rounded-xl border border-border/60 bg-bg-base hover:bg-bg-raised cursor-pointer transition flex flex-col justify-between gap-2"
                              >
                                <div className="space-y-1">
                                  <h4 className="font-bold text-xs line-clamp-2 text-text-primary leading-snug">{t.title}</h4>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                                    t.priority === "high" ? "bg-error/10 text-error" : t.priority === "medium" ? "bg-warning/10 text-warning" : "bg-text-muted/10 text-text-muted"
                                  }`}>
                                    {t.priority}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-text-muted">
                                  <span>Progress: {t.completedSubtasksCount}/{t.subtasksCount}</span>
                                  <span className="font-semibold text-accent-primary">Open →</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted">
                          <span className="text-2xl mb-2">📅</span>
                          <p className="text-xs">Click on any date in the calendar grid to see scheduled tasks and details.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
            <div className="space-y-6 animate-fade-in pb-10">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
                  <p className="text-text-muted text-sm mt-1">Configure your workspace preferences and integrations.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetToDefaults}
                    className="bg-bg-surface hover:bg-error/10 hover:text-error hover:border-error/30 text-text-primary border border-border px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>

              {/* Sub-tabs selector */}
              <div className="flex border-b border-border/50 gap-4 mb-6">
                {[
                  { id: "general", label: "General" },
                  { id: "ai", label: "AI Assistant" },
                  { id: "integrations", label: "Integrations" },
                  { id: "notifications", label: "Notifications" },
                  { id: "logs", label: "System Logs" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveSettingsTab(t.id as any)}
                    className={`pb-2.5 text-sm font-semibold border-b-2 transition-all relative ${
                      activeSettingsTab === t.id
                        ? "border-accent-primary text-text-primary"
                        : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}

                {/* Auto-save success indicator */}
                {showSaveSuccess && (
                  <span className="ml-auto text-xs text-success font-semibold flex items-center gap-1 animate-fade-in">
                    <span>✓</span> Changes saved to Firestore
                  </span>
                )}
              </div>

              {/* Tab Content rendering */}
              <div className="min-h-[400px]">
                {activeSettingsTab === "general" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Work hours & days card */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Work Preferences</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">Start Hour</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={settingsState.workHours.start}
                                onChange={(e) => setSettingsState({
                                  ...settingsState,
                                  workHours: { ...settingsState.workHours, start: e.target.value }
                                })}
                                style={{ colorScheme: "dark" }}
                                className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">End Hour</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={settingsState.workHours.end}
                                onChange={(e) => setSettingsState({
                                  ...settingsState,
                                  workHours: { ...settingsState.workHours, end: e.target.value }
                                })}
                                style={{ colorScheme: "dark" }}
                                className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Working Days Checkboxes */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Working Days</span>
                          <div className="flex flex-wrap gap-2">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                              const isChecked = settingsState.workHours.days.includes(day);
                              return (
                                <button
                                  key={day}
                                  onClick={() => {
                                    const nextDays = isChecked 
                                      ? settingsState.workHours.days.filter((d) => d !== day)
                                      : [...settingsState.workHours.days, day];
                                    setSettingsState({
                                      ...settingsState,
                                      workHours: { ...settingsState.workHours, days: nextDays }
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                    isChecked 
                                      ? "bg-accent-primary/10 border-accent-primary text-accent-primary" 
                                      : "border-border text-text-muted hover:border-text-primary"
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timezone & Defaults Card */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">System Localization</h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Timezone</span>
                          <select
                            value={settingsState.timezone}
                            onChange={(e) => setSettingsState({ ...settingsState, timezone: e.target.value })}
                            className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="UTC">Coordinated Universal Time (UTC)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">Meeting Duration</span>
                            <select
                              value={settingsState.meetingDuration}
                              onChange={(e) => setSettingsState({ ...settingsState, meetingDuration: Number(e.target.value) })}
                              className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                            >
                              <option value={15}>15 Minutes</option>
                              <option value={30}>30 Minutes</option>
                              <option value={60}>1 Hour</option>
                              <option value={120}>2 Hours</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">Default Priority</span>
                            <select
                              value={settingsState.taskPriority}
                              onChange={(e) => setSettingsState({ ...settingsState, taskPriority: e.target.value as any })}
                              className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "ai" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    {/* AI Agent Behaviors */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Automation Settings</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Automation Mode</span>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: "copilot", title: "Co-Pilot", desc: "AI drafts everything and waits for approval." },
                              { id: "autopilot", title: "Autopilot", desc: "AI schedules calendar and drafts email directly." }
                            ].map((mode) => {
                              const isActive = settingsState.automationMode === mode.id;
                              return (
                                <div
                                  key={mode.id}
                                  onClick={() => setSettingsState({ ...settingsState, automationMode: mode.id as any })}
                                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between h-28 ${
                                    isActive 
                                      ? "border-accent-primary bg-accent-primary/5 shadow-[0_0_12px_rgba(59,130,246,0.1)]" 
                                      : "border-border bg-bg-base hover:border-text-muted"
                                  }`}
                                >
                                  <span className={`text-xs font-bold ${isActive ? "text-accent-primary" : "text-text-primary"}`}>
                                    {mode.title}
                                  </span>
                                  <p className="text-[10px] text-text-muted leading-relaxed">{mode.desc}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase">AI Response Style</span>
                          <select
                            value={settingsState.responseStyle}
                            onChange={(e) => setSettingsState({ ...settingsState, responseStyle: e.target.value as any })}
                            className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                          >
                            <option value="concise">Concise (Short and focused summaries)</option>
                            <option value="detailed">Detailed (Includes reasoning and breakdown)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Proactive Agent parameters */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Proactive Settings</h3>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Control how the AI checks your workspace tasks and calendar overlaps in the background.
                      </p>
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-bg-base">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-text-primary">Context-Aware Nudges</p>
                          <p className="text-[10px] text-text-muted leading-normal">Let AI scan Firestore tasks + Calendar to suggest schedule buffers.</p>
                        </div>
                        <button
                          onClick={() => setSettingsState({ ...settingsState, proactiveNudges: !settingsState.proactiveNudges })}
                          className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                            settingsState.proactiveNudges ? "bg-accent-primary justify-end" : "bg-border justify-start"
                          }`}
                        >
                          <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "integrations" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    {/* Google OAuth Connection statuses */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Connected Accounts</h3>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Google workspace credentials required for live Calendar & Gmail write processes.
                      </p>

                      {(() => {
                        const token = mounted ? sessionStorage.getItem("googleAccessToken") : null;
                        const isConnected = token && token !== "";
                        const isSandbox = token === "mock-sandbox-token" || token === "mock-token-refresh" || (token && token.startsWith("mock-"));

                        let statusColor = "text-error bg-error/15 border-error/20";
                        let statusText = "Not Connected";
                        if (isConnected) {
                          if (isSandbox) {
                            statusColor = "text-warning bg-warning/15 border-warning/20";
                            statusText = "Simulated Sandbox Mode";
                          } else {
                            statusColor = "text-success bg-success/15 border-success/20";
                            statusText = "Connected ✓";
                          }
                        }

                        return (
                          <div className="space-y-4 mt-2">
                            <div className="space-y-3">
                              {/* Google Calendar Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">📅</span>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-text-primary">Google Calendar</p>
                                    <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {isConnected ? (
                                    <button
                                      onClick={() => {
                                        sessionStorage.removeItem("googleAccessToken");
                                        window.location.href = "/login";
                                      }}
                                      className="px-3 py-1.5 border border-error/30 hover:bg-error/10 text-error text-xs font-bold rounded-lg transition"
                                    >
                                      Disconnect
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleReAuthorize}
                                      className="px-3 py-1.5 bg-accent-primary hover:brightness-110 text-white text-xs font-bold rounded-lg transition shadow"
                                    >
                                      Authorize
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Gmail Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">📧</span>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-text-primary">Gmail Actions</p>
                                    <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {isConnected ? (
                                    <button
                                      onClick={() => {
                                        sessionStorage.removeItem("googleAccessToken");
                                        setAuthError("Google OAuth session expired. Please sign in again to sync Calendar & Gmail.");
                                      }}
                                      className="px-3 py-1.5 border border-error/30 hover:bg-error/10 text-error text-xs font-bold rounded-lg transition"
                                    >
                                      Disconnect
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleReAuthorize}
                                      className="px-3 py-1.5 bg-accent-primary hover:brightness-110 text-white text-xs font-bold rounded-lg transition shadow"
                                    >
                                      Authorize
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Permanent Silent Sync Row */}
                              <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">⚡</span>
                                  <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-text-primary">Permanent Silent Sync</p>
                                    <span className={`text-[9px] px-2 py-0.5 border rounded-full font-bold uppercase ${
                                      isGoogleConnected 
                                        ? "text-success bg-success/15 border-success/20" 
                                        : "text-error bg-error/15 border-error/20"
                                    }`}>
                                      {isGoogleConnected ? "Enabled ✓" : "Not Enabled"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {isGoogleConnected ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-success font-bold px-3 py-1.5 bg-success/5 border border-success/20 rounded-lg">
                                        Active & Locked
                                      </span>
                                      <button
                                        onClick={handleDisconnectSilentSync}
                                        className="px-3 py-1.5 border border-error/30 hover:bg-error/10 text-error text-xs font-bold rounded-lg transition cursor-pointer"
                                      >
                                        Disconnect
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={handleConnectSilentSync}
                                      className="px-3 py-1.5 bg-accent-primary hover:brightness-110 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer"
                                    >
                                      Enable
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Token Expired warnings */}
                            {isConnected && !isSandbox && (
                              <div className="p-3 bg-success/5 border border-success/20 rounded-xl flex items-center justify-between">
                                <p className="text-[10px] text-text-muted leading-relaxed">
                                  Active Access Token verified. Token is refreshed dynamically during AI calls.
                                </p>
                                <button
                                  onClick={handleReAuthorize}
                                  disabled={reAuthLoading}
                                  className="bg-success text-white font-bold text-[9px] px-2.5 py-1.5 rounded-lg hover:brightness-110 disabled:opacity-60 transition shrink-0"
                                >
                                  {reAuthLoading ? "Signing in..." : "Re-Authorize"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Sync Preference Intervals */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Sync Preferences</h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Google Calendar Poll Frequency</span>
                          <select
                            value={settingsState.syncPreferences.calendar}
                            onChange={(e) => setSettingsState({
                              ...settingsState,
                              syncPreferences: { ...settingsState.syncPreferences, calendar: Number(e.target.value) }
                            })}
                            className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                          >
                            <option value={60000}>Real-time (Every 1 Minute)</option>
                            <option value={900000}>Co-Pilot (Every 15 Minutes)</option>
                            <option value={3600000}>Hourly (Every 1 Hour)</option>
                            <option value={0}>Manual Polling Only</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Gmail Draft Polling Interval</span>
                          <select
                            value={settingsState.syncPreferences.gmail}
                            onChange={(e) => setSettingsState({
                              ...settingsState,
                              syncPreferences: { ...settingsState.syncPreferences, gmail: Number(e.target.value) }
                            })}
                            className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                          >
                            <option value={60000}>Real-time (Every 1 Minute)</option>
                            <option value={900000}>Co-Pilot (Every 15 Minutes)</option>
                            <option value={3600000}>Hourly (Every 1 Hour)</option>
                            <option value={0}>Manual Polling Only</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "notifications" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    {/* Channels toggling */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Communication Channels</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border border-border bg-bg-base rounded-xl">
                          <span className="text-xs font-bold text-text-primary">In-app notifications</span>
                          <button
                            onClick={() => setSettingsState({
                              ...settingsState,
                              notifications: { ...settingsState.notifications, inApp: !settingsState.notifications.inApp }
                            })}
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                              settingsState.notifications.inApp ? "bg-accent-primary justify-end" : "bg-border justify-start"
                            }`}
                          >
                            <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-3 border border-border bg-bg-base rounded-xl">
                          <span className="text-xs font-bold text-text-primary">Email alerts</span>
                          <button
                            onClick={() => setSettingsState({
                              ...settingsState,
                              notifications: { ...settingsState.notifications, email: !settingsState.notifications.email }
                            })}
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                              settingsState.notifications.email ? "bg-accent-primary justify-end" : "bg-border justify-start"
                            }`}
                          >
                            <span className="h-4 w-4 bg-white rounded-full shadow-md" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quiet Hours & Alerts */}
                    <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4">
                      <h3 className="text-lg font-bold text-text-primary">Quiet Hours & Reminders</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">DND Start Time</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={settingsState.notifications.quietHours.start}
                                onChange={(e) => setSettingsState({
                                  ...settingsState,
                                  notifications: {
                                    ...settingsState.notifications,
                                    quietHours: { ...settingsState.notifications.quietHours, start: e.target.value }
                                  }
                                })}
                                style={{ colorScheme: "dark" }}
                                className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase">DND End Time</span>
                            <div className="relative">
                              <input
                                type="time"
                                value={settingsState.notifications.quietHours.end}
                                onChange={(e) => setSettingsState({
                                  ...settingsState,
                                  notifications: {
                                    ...settingsState.notifications,
                                    quietHours: { ...settingsState.notifications.quietHours, end: e.target.value }
                                  }
                                })}
                                style={{ colorScheme: "dark" }}
                                className="w-full bg-bg-base border border-border rounded-lg p-2 pr-10 text-xs text-text-primary focus:outline-none focus:border-accent-primary relative z-10"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted z-20 pointer-events-none">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase">Reminder Frequency</span>
                          <select
                            value={settingsState.notifications.reminderFrequency}
                            onChange={(e) => setSettingsState({
                              ...settingsState,
                              notifications: { ...settingsState.notifications, reminderFrequency: Number(e.target.value) }
                            })}
                            className="w-full bg-bg-base border border-border rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                          >
                            <option value={5}>5 Minutes Before</option>
                            <option value={15}>15 Minutes Before</option>
                            <option value={60}>1 Hour Before</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === "logs" && (
                  <div className="rounded-2xl border border-border bg-bg-surface p-6 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                      <h3 className="text-lg font-bold text-text-primary">Agent Process Logs</h3>
                      <button
                        onClick={() => {
                          setActionsMap({ "1": [], "2": [], "3": [], "4": [] });
                          alert("All simulated activity logs cleared!");
                        }}
                        className="bg-error/10 hover:bg-error/15 border border-error/25 text-error px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        Clear All Logs
                      </button>
                    </div>

                    <div className="overflow-x-auto max-h-[350px]">
                      {(() => {
                        const allActions = Object.entries(actionsMap).flatMap(([taskId, list]) => {
                          const task = tasks.find((t) => t.id === taskId);
                          return list.map((act) => ({
                            ...act,
                            taskTitle: task?.title || "System Process"
                          }));
                        });

                        if (allActions.length === 0) {
                          return <p className="text-sm text-text-muted italic py-10 text-center">No system process logs recorded.</p>;
                        }

                        return (
                          <table className="w-full font-mono text-[11px] text-left border-collapse text-text-primary">
                            <thead>
                              <tr className="border-b border-border/50 text-[10px] uppercase text-text-muted">
                                <th className="py-2.5 pr-4">Timestamp</th>
                                <th className="py-2.5 px-4">Action Type</th>
                                <th className="py-2.5 px-4">Detail</th>
                                <th className="py-2.5 pl-4">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {allActions.map((action, i) => (
                                <tr key={i} className="hover:bg-bg-base/40">
                                  <td className="py-3 pr-4 text-text-muted">
                                    {action.executedAt ? new Date(action.executedAt).toLocaleTimeString() : "Pending"}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-blue-400">{action.actionType}</td>
                                  <td className="py-3 px-4 text-text-muted truncate max-w-xs">{action.detail}</td>
                                  <td className="py-3 pl-4">
                                    <span className={`px-2 py-0.5 text-[10px] rounded-md font-bold ${
                                      action.status === "executed" || action.status === "approved" 
                                        ? "bg-success/15 text-success" 
                                        : "bg-warning/15 text-warning"
                                    }`}>
                                      {action.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
        </section>

        {/* CHAT PANEL */}
        <aside 
          className={`fixed inset-y-0 right-0 z-20 w-full flex flex-col transform md:relative md:translate-x-0 ${
            isResizing ? "" : "transition-all duration-300"
          } ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
          style={{
            width: mounted && window.innerWidth >= 768 ? `${chatWidth}px` : "100%",
            maxWidth: mounted && window.innerWidth >= 768 ? "none" : "384px",
            background: isDark
              ? "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(20,30,55,0.95) 100%)"
              : "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.98) 100%)",
            backdropFilter: "blur(20px)",
            borderLeft: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.07)",
            boxShadow: isDark ? "-4px 0 24px rgba(0,0,0,0.3)" : "-4px 0 24px rgba(0,0,0,0.06)"
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
          <div
            className="p-4 flex justify-between items-center backdrop-blur-md"
            style={{
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid var(--border)",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>ActionMate AI Agent</h3>
                <p className="text-[10px] text-blue-400 font-medium">Always ready to act</p>
              </div>
            </div>
            <button 
              onClick={() => setChatOpen(false)}
              className="md:hidden text-lg p-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
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
                    : "rounded-tl-none"
                }`}
                style={msg.sender === "user" ? {
                  background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                  boxShadow: "0 4px 14px rgba(139,92,246,0.25)"
                } : {
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                  border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
                  color: "var(--text-primary)"
                }}
              >
                <p className="leading-relaxed">{renderMessageText(msg.text)}</p>
                
                {/* ActionCard integration inside AI response */}
                {msg.actions && !msg.executed && !msg.dismissed && (
                  <div className="mt-4">
                    <AgentActionCard
                      pendingActions={msg.actions}
                      taskId={msg.taskId || ""}
                      onSuccess={(results) => handleActionSuccess(i, results, msg.taskId)}
                      onDismiss={() => handleActionDismiss(i)}
                      isAutopilot={settingsState.automationMode === "autopilot"}
                    />
                  </div>
                )}
                {msg.actions && msg.executed && (
                  <div className="mt-4 text-xs text-green-400 font-bold flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <span>✓</span> Recommendation Approved & Executed
                  </div>
                )}
                {msg.actions && msg.dismissed && (
                  <div
                    className="mt-4 text-xs font-bold flex items-center gap-1.5 rounded-xl p-3"
                    style={{
                      color: "var(--text-muted)",
                      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.04)",
                      border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)"
                    }}
                  >
                    <span>✕</span> Recommendation Dismissed
                  </div>
                )}
              </div>
              </div>
            ))}

            {/* Narrated Status Loading Indicator */}
            {loadingText && (
              <div className="flex justify-start animate-pulse">
                <div
                  className="rounded-2xl rounded-tl-none p-3.5 text-xs text-blue-400 flex items-center gap-2.5 shadow-inner"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
                    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)"
                  }}
                >
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
          <div
            className="px-4 py-2 flex flex-wrap gap-1.5"
            style={{
              background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)",
              borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)"
            }}
          >
            {[
              { label: "📅 Sync Calendar", prompt: "Sync my calendar events for tomorrow" },
              { label: "📨 Extension Email", prompt: "Draft an extension request email to Prof. Sharma" },
              { label: "🔍 Check Conflicts", prompt: "Check for any scheduling conflicts today" }
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(chip.prompt)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer"
                style={{
                  border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
                  color: "var(--text-muted)"
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat panel bottom input bar */}
          <div
            className="p-3 backdrop-blur-md"
            style={{
              borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"
            }}
          >
            <div
              className="flex gap-2 items-center rounded-2xl px-3 py-2 transition-all"
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)"
              }}
            >
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
                placeholder={isListening ? "Listening... speak now" : "Ask ActionMate..."}
                rows={1}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none resize-none max-h-20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                style={{ color: "var(--text-primary)", caretColor: "var(--accent-primary)" }}
              />

              {/* Mic Button Wrapper */}
              <div className="relative flex items-center justify-center flex-shrink-0">
                {/* Circular pulsing ripples (when active) */}
                {isListening && (
                  <>
                    <span className="absolute h-8 w-8 rounded-full border border-red-500/30 animate-ripple-1" />
                    <span className="absolute h-8 w-8 rounded-full border border-red-500/20 animate-ripple-2" />
                    <span className="absolute h-8 w-8 rounded-full border border-red-500/10 animate-ripple-3" />
                  </>
                )}

                <button
                  onClick={handleVoiceInput}
                  className={`relative h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border backdrop-blur-md cursor-pointer ${
                    isListening
                      ? "bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                      : "bg-white/[0.02] border-white/5 text-text-muted hover:bg-accent-primary/10 hover:border-accent-primary/20 hover:text-accent-primary hover:scale-105"
                  }`}
                  title={isListening ? "Stop listening" : "Speak command"}
                >
                  {isListening ? (
                    /* Soundwave Visualizer Bars */
                    <span className="flex items-end gap-[2px] h-[12px]">
                      <span className="wave-bar" style={{ animationDelay: "0.1s" }} />
                      <span className="wave-bar" style={{ animationDelay: "0.3s" }} />
                      <span className="wave-bar" style={{ animationDelay: "0.5s" }} />
                      <span className="wave-bar" style={{ animationDelay: "0.2s" }} />
                      <span className="wave-bar" style={{ animationDelay: "0.4s" }} />
                    </span>
                  ) : (
                    /* Sleek Mic Icon */
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>

              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  inputText.trim() 
                    ? "bg-gradient-to-tr from-blue-600 to-violet-600 text-white shadow-md hover:brightness-110" 
                    : "opacity-40 cursor-not-allowed"
                }`}
                style={!inputText.trim() ? { color: "var(--text-muted)" } : {}}
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
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
