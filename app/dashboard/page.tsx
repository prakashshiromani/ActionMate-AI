"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import ConflictBanner from "@/components/ConflictBanner";
import SubtaskList from "@/components/SubtaskList";
import AgentActivityLog from "@/components/AgentActivityLog";
import SkeletonLoader from "@/components/SkeletonLoader";
import { PendingAction } from "@/types";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc, onSnapshot, deleteField, serverTimestamp } from "firebase/firestore";

import { playConflictAlert, playAiMessage, playSuccess, playDismiss, playTaskComplete } from "@/lib/sounds";

// Import modular sub-components
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import ChatPanel from "./components/ChatPanel";
import DashboardView from "./components/DashboardView";
import TasksView from "./components/TasksView";
import CalendarView from "./components/CalendarView";
import CompletedView from "./components/CompletedView";
import LogsView from "./components/LogsView";
import SettingsView from "./components/SettingsView";

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
  timestamp?: Date;
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
  const [settingsState, setSettingsState] = useState<SettingsState>(defaultSettings);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hey! I'm ActionMate — ready to resolve your tasks. What's on your plate today?", timestamp: new Date() }
  ]);

  // Clear chat handler
  const handleClearChat = () => {
    if (confirm("Clear all chat history? This cannot be undone.")) {
      setMessages([{ sender: "ai", text: "Chat cleared. What would you like to work on?", timestamp: new Date() }]);
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MockTask | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true); // default dark
  // SSR-safe desktop detector — avoids window.innerWidth in JSX
  const [isDesktop, setIsDesktop] = useState(false);
  
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Apply saved theme preference on mount
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const dark = saved !== "light"; // default to dark if no preference saved
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");

    // SSR-safe desktop detection
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    // Command palette keydown listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("googleConnected") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
        alert("🎉 Google Calendar & Gmail connected successfully for silent sync!");
      }
    }

    return () => {
      window.removeEventListener("resize", checkDesktop);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
    const isSandbox = token === "mock-sandbox-token" || (token && token.startsWith("mock-"));
    
    if (isSandbox) {
      setAuthError(null);
    } else if (!token && !isGoogleConnected) {
      setAuthError("Google OAuth session expired. Please sign in again to sync Calendar & Gmail.");
    } else if (token || isGoogleConnected) {
      setAuthError(null);
    }
  }, [isLoaded, isGoogleConnected]);

  const handleConnectSilentSync = () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;

    const nonce = crypto.randomUUID();
    sessionStorage.setItem("oauth_nonce", nonce);
    document.cookie = `oauth_nonce=${nonce}; path=/; max-age=300; SameSite=Lax`;

    const clientId = "690561405622-mnpgte0fbt7gvi7c3u635dc8u4gap0gn.apps.googleusercontent.com";
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/google-callback");
    const scopes = encodeURIComponent("https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.compose");
    const state = encodeURIComponent(`${currentUser.uid}:${nonce}`);

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
        document.cookie = "actionmate_auth=; path=/; max-age=0";
      } catch (err) {
        console.error("Failed to disconnect silent sync:", err);
      }
    }
  };

  const handleReAuthorize = async () => {
    setReAuthLoading(true);
    try {
      if (!auth || !auth.app) {
        sessionStorage.setItem("googleAccessToken", "mock-sandbox-token");
        setAuthError(null);
        setReAuthLoading(false);
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events");
      provider.addScope("https://www.googleapis.com/auth/gmail.compose");
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

  const prevConflictRef = useRef<any>(null);
  useEffect(() => {
    if (activeConflict && !prevConflictRef.current) {
      playConflictAlert();
    }
    prevConflictRef.current = activeConflict;
  }, [activeConflict]);

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

  const [actionsMap, setActionsMap] = useState<Record<string, any[]>>({
    "1": [
      { actionType: "CALENDAR_BLOCK", status: "executed", executedAt: new Date(Date.now() - 3600000), detail: "Relational schema study slot" },
      { actionType: "GMAIL_DRAFT", status: "executed", executedAt: new Date(Date.now() - 1800000), detail: "Extension request to Prof. Sharma" }
    ],
    "2": [
      { actionType: "CALENDAR_BLOCK", status: "executed", executedAt: new Date(Date.now() - 7200000), detail: "Slide content prep block" },
      { actionType: "CONFLICT_DETECTED", status: "executed", executedAt: new Date(Date.now() - 7200000), detail: "Deadline conflict detected at 5 PM" }
    ],
    "3": [
      { actionType: "TASK_BREAKDOWN", status: "executed", executedAt: new Date(Date.now() - 86400000), detail: "Autonomously generated subtask breakdown" }
    ],
    "4": []
  });

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== "function") {
      setIsLoaded(true);
      return;
    }

    let unsubscribeSettings: (() => void) | null = null;
    let unsubscribeTasks: (() => void) | null = null;
    let safetyTimeout: NodeJS.Timeout | null = null;

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

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("sandboxTasks", JSON.stringify(tasks));
    localStorage.setItem("sandboxSubtasks", JSON.stringify(subtasksMap));
    localStorage.setItem("sandboxActions", JSON.stringify(actionsMap));
  }, [tasks, subtasksMap, actionsMap, isLoaded]);

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
    if (confirm("Are you sure you want to reset all preferences to defaults? This will overwrite your current settings.")) {
      setSettingsState(defaultSettings);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this task? This action cannot be undone.");
    if (!confirmed) return;

    try {
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

      setSelectedTask(null);

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

    setTasks((prev) => {
      return prev.map((t) => {
        if (t.id === taskId) {
          const list = subtasksMap[taskId] || [];
          const completedCount = list.filter((st) =>
            st.subtaskId === subtaskId ? completed : st.completed
          ).length;

          const status = completedCount === t.subtasksCount ? "completed" as const : t.status;

          if (status === "completed" && t.status !== "completed") {
            playTaskComplete();
            setTimeout(() => {
              setSelectedTask(null);
              setActiveTab("completed");
            }, 800);
          }

          return {
            ...t,
            completedSubtasksCount: completedCount,
            status,
          };
        }
        return t;
      });
    });

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
    const newMessages = [...messages, { sender: "user" as const, text: userPrompt, timestamp: new Date() }];
    setMessages(newMessages);
    setInputText("");
    
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
      
      playAiMessage();
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai" as const,
          text: settingsState.automationMode === "autopilot"
            ? `${data.agentText}\n\n⚡ **Autopilot Mode Active:** Executing the recommended actions autonomously...`
            : data.agentText,
          actions: data.pendingActions && data.pendingActions.length > 0 ? data.pendingActions : undefined,
          taskId: data.taskId,
          timestamp: new Date()
        }
      ]);

      if (settingsState.automationMode === "autopilot" && data.pendingActions && data.pendingActions.length > 0) {
        setTimeout(() => {
          triggerAutoExecution(data.pendingActions, data.taskId || "", newMessages.length);
        }, 500);
      }

      if (data.taskId && data.suggestedSubtasks) {
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

          let topic = "Assignment";
          if (userPrompt.toLowerCase().includes("uml")) {
            topic = "UML Diagrams Assignment";
          } else if (userPrompt.toLowerCase().includes("dbms")) {
            topic = "DBMS Assignment";
          } else if (userPrompt.toLowerCase().includes("presentation")) {
            topic = "Presentation slides";
          } else {
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
                body: `Dear Prof. Sharma,\n\nI am writing to request a brief 24-hour extension on the ${topic} due tomorrow. Due to scheduling conflicts, I need a bit more time to complete it to standard.\n\nThank you,\n${auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "Aryan Mehta"}`
              },
              displaySummary: `Draft email to "sharma.prof@example.com" with subject "Extension Request: ${topic}"`
            }
          ];

          playAiMessage();
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai" as const,
              text: settingsState.automationMode === "autopilot"
                ? `I've analyzed your request for **${topic}**.\n\n⚡ **Autopilot Mode Active:** I'm scheduling your deep work slot and drafting the email to **Prof. Sharma** autonomously...`
                : `I've analyzed your request for **${topic}**. \n\nI found a schedule conflict:\n• **Schedule Conflict:** Your calendar is busy tomorrow.\n• **Action Block:** Suggesting a study/deep work slot.\n• **Backup Plan:** Drafted an extension email to **Prof. Sharma** in your Gmail Drafts.\n\nPlease approve the action cards below:`,
              actions: mockActions,
              taskId: mockTaskId,
              timestamp: new Date()
            }
          ]);

          if (settingsState.automationMode === "autopilot") {
            setTimeout(() => {
              triggerAutoExecution(mockActions, mockTaskId, newMessages.length);
            }, 500);
          }

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
    playSuccess();
    const calendarResult = results.find(r => r.type === "CALENDAR_BLOCK");
    const gmailResult = results.find(r => r.type === "GMAIL_DRAFT");

    const calendarSuccess = calendarResult ? calendarResult.status === "success" : true;
    const gmailSuccess = gmailResult ? gmailResult.status === "success" : true;
    const allSuccess = calendarSuccess && gmailSuccess;

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
        setActiveConflict(null);
      } else {
        const rawDetail = calendarResult.detail || "";
        let cleanMsg = rawDetail;
        const dashIdx = rawDetail.lastIndexOf(" — ");
        if (dashIdx !== -1) cleanMsg = rawDetail.substring(dashIdx + 3);
        if (cleanMsg.length > 120) cleanMsg = cleanMsg.substring(0, 117) + "...";
        text += `\n⚠️ Calendar block failed: ${cleanMsg}`;
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
      setAuthError(null);
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "ai" as const,
        text,
        timestamp: new Date()
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
    playDismiss();
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

      setActionsMap((prev) => {
        const copy = { ...prev };
        const list = copy[taskId] || [];
        copy[taskId] = list.map((act) => ({
          ...act,
          status: "rejected"
        }));
        return copy;
      });

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

      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        isDark={isDark}
        toggleTheme={toggleTheme}
        auth={auth}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        
        {/* CENTER CONTENT VIEW */}
        <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          {/* Mobile-only page header */}
          <div className="md:hidden flex items-center justify-between pb-3 border-b border-border/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold capitalize text-text-primary">
                {activeTab === "completed" ? "Completed Tasks" : activeTab === "logs" ? "Agent Logs" : activeTab}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 bg-bg-surface hover:bg-bg-raised border border-border text-[10px] font-bold rounded-lg transition active:scale-95"
              >
                {/* Sun/Moon icon */}
                <span style={{ color: isDark ? "#93c5fd" : "#F59E0B", display: "flex", alignItems: "center" }}>
                  {isDark ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                {/* Mini Toggle Pill */}
                <span
                  className="flex items-center rounded-full transition-all duration-300"
                  style={{
                    width: "26px",
                    height: "14px",
                    padding: "2px",
                    background: isDark ? "rgba(59,130,246,0.4)" : "rgba(245,158,11,0.4)",
                    border: `1px solid ${isDark ? "rgba(59,130,246,0.5)" : "rgba(245,158,11,0.5)"}`,
                    justifyContent: isDark ? "flex-end" : "flex-start",
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: "8px",
                      height: "8px",
                      background: isDark ? "#93c5fd" : "#F59E0B",
                      transition: "all 0.3s ease",
                    }}
                  />
                </span>
              </button>

              {/* Show/Hide Chat */}
              <button 
                onClick={() => setChatOpen(!chatOpen)}
                className="px-2.5 py-1.5 bg-bg-surface hover:bg-bg-raised border border-border text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition text-text-primary active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{chatOpen ? "Hide Chat" : "Show Chat"}</span>
              </button>

              {/* Mobile User Avatar + Logout Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                  className="relative h-8 w-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shadow-lg transition active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                    boxShadow: "0 0 0 2px rgba(139,92,246,0.35), 0 4px 12px rgba(99,102,241,0.35)",
                  }}
                  title="Profile & Logout"
                >
                  {(auth?.currentUser?.displayName || auth?.currentUser?.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                  {/* Online dot */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400"
                    style={{
                      boxShadow: "0 0 0 2px var(--bg-base)",
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {mobileProfileOpen && (
                  <>
                    {/* Backdrop to close */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMobileProfileOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl overflow-hidden animate-slide-down"
                      style={{
                        background: isDark ? "rgba(15,23,42,0.97)" : "rgba(255,255,255,0.97)",
                        backdropFilter: "blur(20px)",
                        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                        boxShadow: isDark
                          ? "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset"
                          : "0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04) inset",
                      }}
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shadow-md flex-shrink-0"
                            style={{
                              background: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
                              boxShadow: "0 0 0 2px rgba(139,92,246,0.3), 0 4px 10px rgba(99,102,241,0.3)",
                            }}
                          >
                            {(auth?.currentUser?.displayName || auth?.currentUser?.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: "var(--text-primary)", maxWidth: "140px" }}
                            >
                              {auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "User"}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)", maxWidth: "140px" }}>
                              {auth?.currentUser?.email || "Pro Plan · Active"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Plan Badge */}
                      <div className="px-4 py-2 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)",
                            color: "#A78BFA",
                            border: "1px solid rgba(139,92,246,0.2)",
                          }}
                        >
                          ✦ Pro Plan · Active
                        </span>
                      </div>

                      {/* Sign Out Button */}
                      <div className="p-2">
                        <button
                          onClick={async () => {
                            setMobileProfileOpen(false);
                            if (confirm("Are you sure you want to sign out of ActionMate?")) {
                              try {
                                if (auth) {
                                  const { signOut } = await import("firebase/auth");
                                  await signOut(auth);
                                }
                              } catch (err) {
                                console.error("Firebase sign out failed:", err);
                              }

                              try {
                                await fetch("/api/auth/session", { method: "DELETE" });
                              } catch (err) {
                                console.error("Session deletion failed:", err);
                              }

                              sessionStorage.clear();
                              localStorage.removeItem("sandboxTasks");
                              localStorage.removeItem("sandboxSubtasks");
                              localStorage.removeItem("sandboxActions");
                              localStorage.removeItem("sandboxSettings");
                              document.cookie = "actionmate_auth=; path=/; max-age=0";
                              window.location.href = "/login";
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left"
                          style={{
                            color: "#EF4444",
                            background: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.05)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.1)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.05)")
                          }
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          <span className="text-xs font-semibold">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {loading ? (
            <SkeletonLoader variant="task" count={4} />
          ) : selectedTask ? (
            // TASK DETAIL VIEW
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
          ) : (
            // TAB CONTENT WRAPPER FOR TRANSITIONS
            <div key={activeTab} className="animate-fade-in space-y-8 pb-10">
              {activeTab === "dashboard" ? (
                <DashboardView
                  tasks={tasks}
                  setSelectedTask={setSelectedTask}
                  setChatOpen={setChatOpen}
                  setInputText={setInputText}
                  setMessages={setMessages}
                  activeConflict={activeConflict}
                  setActiveConflict={setActiveConflict}
                  mounted={mounted}
                />
              ) : activeTab === "tasks" ? (
                <TasksView
                  tasks={tasks}
                  setSelectedTask={setSelectedTask}
                  setChatOpen={setChatOpen}
                  setInputText={setInputText}
                  setMessages={setMessages}
                />
              ) : activeTab === "calendar" ? (
                <CalendarView
                  tasks={tasks}
                  setSelectedTask={setSelectedTask}
                  calendarDate={calendarDate}
                  setCalendarDate={setCalendarDate}
                  selectedCalendarDate={selectedCalendarDate}
                  setSelectedCalendarDate={setSelectedCalendarDate}
                />
              ) : activeTab === "completed" ? (
                <CompletedView
                  tasks={tasks}
                  setSelectedTask={setSelectedTask}
                />
              ) : activeTab === "logs" ? (
                <LogsView
                  actionsMap={actionsMap}
                  tasks={tasks}
                />
              ) : (
                <SettingsView
                  settingsState={settingsState}
                  setSettingsState={setSettingsState}
                  handleResetToDefaults={handleResetToDefaults}
                  isDark={isDark}
                  isGoogleConnected={isGoogleConnected}
                  reAuthLoading={reAuthLoading}
                  handleReAuthorize={handleReAuthorize}
                  handleConnectSilentSync={handleConnectSilentSync}
                  handleDisconnectSilentSync={handleDisconnectSilentSync}
                  showSaveSuccess={showSaveSuccess}
                  setActionsMap={setActionsMap}
                  tasks={tasks}
                />
              )}
            </div>
          )}
          
        </section>

        {/* CHAT PANEL */}
        <ChatPanel 
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
          messages={messages}
          inputText={inputText}
          setInputText={setInputText}
          isListening={isListening}
          handleVoiceInput={handleVoiceInput}
          handleSendMessage={handleSendMessage}
          handleClearChat={handleClearChat}
          loadingText={loadingText}
          chatWidth={chatWidth}
          isResizing={isResizing}
          startResizing={startResizing}
          isDesktop={isDesktop}
          isDark={isDark}
          settingsState={settingsState}
          handleActionSuccess={handleActionSuccess}
          handleActionDismiss={handleActionDismiss}
          messagesEndRef={messagesEndRef}
          textareaRef={textareaRef}
          renderMessageText={renderMessageText}
        />
        
      </main>

      {/* Reopen collapsed Chat Panel FAB (Desktop only) */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="hidden md:flex fixed bottom-6 right-6 z-40 hover:brightness-110 active:scale-95 text-white h-13 w-13 rounded-2xl items-center justify-center transition duration-200 cursor-pointer animate-scale-up"
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.12) inset",
            width: "52px",
            height: "52px",
          }}
          title="Open AI Assistant"
          aria-label="Open AI Assistant"
        >
          {/* MessageCircle icon — Lucide-style */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="white" stroke="none" />
            <circle cx="12" cy="10" r="1" fill="white" stroke="none" />
            <circle cx="15" cy="10" r="1" fill="white" stroke="none" />
          </svg>
        </button>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <MobileNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedTask={setSelectedTask}
        isDark={isDark}
      />

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-bg-surface border border-border/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-bg-surface">
              <span className="text-base">⌨️</span>
              <input
                type="text"
                placeholder="Type a command or search tabs... (e.g. settings, theme)"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-xs border-none focus:outline-none text-text-primary placeholder:text-text-muted"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] text-text-muted hover:text-text-primary border border-border/40 px-2 py-0.5 rounded font-mono"
              >
                ESC
              </button>
            </div>
            
            <div className="p-2 max-h-72 overflow-y-auto space-y-1 font-sans text-xs bg-bg-surface">
              {[
                { id: "dashboard", label: "Go to Dashboard", shortcut: "⌘D", action: () => { setActiveTab("dashboard"); setSelectedTask(null); } },
                { id: "tasks", label: "Go to Tasks List", shortcut: "⌘T", action: () => { setActiveTab("tasks"); setSelectedTask(null); } },
                { id: "calendar", label: "Go to Calendar Monthly View", shortcut: "⌘C", action: () => { setActiveTab("calendar"); setSelectedTask(null); } },
                { id: "completed", label: "Go to Completed Tasks list", shortcut: "⌘F", action: () => { setActiveTab("completed"); setSelectedTask(null); } },
                { id: "logs", label: "Go to Agent Activity Logs", shortcut: "⌘L", action: () => { setActiveTab("logs"); setSelectedTask(null); } },
                { id: "settings", label: "Go to Integrations & Settings", shortcut: "⌘S", action: () => { setActiveTab("settings"); setSelectedTask(null); } },
                { id: "theme", label: "Toggle Dark/Light Mode Theme", shortcut: "⌘U", action: () => toggleTheme() },
                { id: "new_task", label: "Create a New Custom Task with AI assistant", shortcut: "⌘N", action: () => { setChatOpen(true); setInputText(""); } }
              ]
                .filter((item) => item.label.toLowerCase().includes(paletteSearch.toLowerCase()))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setCommandPaletteOpen(false);
                      setPaletteSearch("");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-primary/10 hover:text-accent-primary flex items-center justify-between text-text-muted transition duration-150 font-medium"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-text-muted/50 bg-bg-base/60 border border-border/40 px-1.5 py-0.5 rounded font-mono">{item.shortcut}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
