"use client";

import React, { ReactNode, useState, useEffect } from "react";
import AgentActionCard from "@/components/AgentActionCard";
import { PendingAction } from "@/types";

function MessageTimestamp({ timestamp }: { timestamp: Date }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, [timestamp]);

  if (!label) return null;
  return (
    <div className="mt-1 text-[9px] opacity-40 text-right select-none font-mono">{label}</div>
  );
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
}

interface ChatPanelProps {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  isListening: boolean;
  handleVoiceInput: () => void;
  handleSendMessage: () => void;
  handleClearChat: () => void;
  loadingText: string | null;
  chatWidth: number;
  isResizing: boolean;
  startResizing: (e: React.MouseEvent) => void;
  isDesktop: boolean;
  isDark: boolean;
  settingsState: SettingsState;
  handleActionSuccess: (index: number, results: any[], targetTaskId?: string) => void;
  handleActionDismiss: (index: number) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  renderMessageText: (text: string) => ReactNode;
}

export default function ChatPanel({
  chatOpen,
  setChatOpen,
  messages,
  inputText,
  setInputText,
  isListening,
  handleVoiceInput,
  handleSendMessage,
  handleClearChat,
  loadingText,
  chatWidth,
  isResizing,
  startResizing,
  isDesktop,
  isDark,
  settingsState,
  handleActionSuccess,
  handleActionDismiss,
  messagesEndRef,
  textareaRef,
  renderMessageText,
}: ChatPanelProps) {
  // Only display the welcome empty state if the user has not sent any message yet
  const showWelcomeEmptyState = messages.length <= 1 && !loadingText && messages[0]?.sender === "ai";

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-20 w-full flex flex-col transform md:relative md:translate-x-0 ${
        isResizing ? "" : "transition-all duration-300"
      } ${chatOpen ? "translate-x-0" : "translate-x-full"}`}
      style={{
        width: isDesktop ? (chatOpen ? `${chatWidth}px` : "0px") : "100%",
        minWidth: isDesktop ? (chatOpen ? "280px" : "0px") : "100%",
        maxWidth: isDesktop ? "none" : "100%",
        background: isDark
          ? "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(20,30,55,0.95) 100%)"
          : "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.98) 100%)",
        backdropFilter: "blur(20px)",
        borderLeft: isDesktop && !chatOpen ? "none" : (isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.07)"),
        boxShadow: chatOpen ? (isDark ? "-4px 0 24px rgba(0,0,0,0.3)" : "-4px 0 24px rgba(0,0,0,0.06)") : "none",
        visibility: isDesktop && !chatOpen ? "hidden" : "visible",
      }}
    >
      {/* Resizer Handle */}
      {chatOpen && (
        <div
          onMouseDown={startResizing}
          className={`hidden md:block absolute top-0 bottom-0 left-0 w-1.5 cursor-col-resize hover:bg-accent-primary/40 transition-colors z-30 ${
            isResizing ? "bg-accent-primary" : "bg-transparent"
          }`}
        />
      )}

      {/* Header */}
      <div
        className="p-4 flex justify-between items-center backdrop-blur-md shrink-0"
        style={{
          borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid var(--border)",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              ActionMate AI Assistant
            </h3>
            <p className="text-[11px] text-blue-400 font-medium">Always ready to resolve</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            aria-label="Clear Chat History"
            className="text-text-muted hover:text-error text-xs p-1.5 rounded-lg hover:bg-error/5 transition-colors border border-transparent hover:border-error/10 cursor-pointer"
          >
            🗑️
          </button>
          
          {/* Desktop collapse button */}
          <button
            onClick={() => setChatOpen(false)}
            title="Collapse Assistant Panel"
            aria-label="Collapse Assistant Panel"
            className="text-text-muted hover:text-text-primary text-xs p-1.5 rounded-lg hover:bg-bg-raised transition-colors border border-transparent hover:border-border/30 cursor-pointer hidden md:block"
          >
            ➡️
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setChatOpen(false)}
            className="md:hidden text-lg p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close Chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Conversation history area */}
      <div
        className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-start"
        role="log"
        aria-live="polite"
        aria-label="Chat conversation history"
      >
        {showWelcomeEmptyState ? (
          /* Animated Welcome Illustration and tips empty state */
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-5 my-auto h-full opacity-90 select-none animate-fade-in">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-accent-primary/10 to-accent-ai/10 border border-accent-primary/20 flex items-center justify-center text-3xl shadow-inner relative">
              🤖
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-bg-surface animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-sm text-text-primary">How can I help you, Aryan?</h4>
              <p className="text-[11px] text-text-muted max-w-[220px] leading-relaxed mx-auto">
                I can sync calendar slots, draft email confirmations, and resolve scheduling conflicts autonomously.
              </p>
            </div>
            <div className="border border-border/80 bg-bg-surface/50 rounded-xl p-3 text-left w-full text-[11px] text-text-muted space-y-2 max-w-[260px] shadow-sm">
              <span className="font-bold text-text-primary block">Try saying or typing:</span>
              <button 
                onClick={() => setInputText("Check for conflicts tomorrow")}
                className="w-full text-left block italic hover:text-accent-primary hover:underline cursor-pointer transition py-0.5 text-text-muted hover:text-text-primary font-medium"
              >
                &bull; &quot;Check for conflicts tomorrow&quot;
              </button>
              <button 
                onClick={() => setInputText("Submit DBMS Assignment by 5 PM")}
                className="w-full text-left block italic hover:text-accent-primary hover:underline cursor-pointer transition py-0.5 text-text-muted hover:text-text-primary font-medium"
              >
                &bull; &quot;Submit DBMS Assignment by 5 PM&quot;
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in w-full`}>
              <div
                className={`${
                  msg.actions && !msg.executed && !msg.dismissed ? "w-full max-w-full" : "max-w-[85%]"
                } rounded-2xl p-3.5 text-sm ${
                  msg.sender === "user" ? "text-white rounded-tr-none shadow-lg" : "rounded-tl-none"
                }`}
                style={
                  msg.sender === "user"
                    ? {
                        background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                        boxShadow: "0 4px 14px rgba(139,92,246,0.25)",
                      }
                    : {
                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
                        border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }
                }
              >
                <p className="leading-relaxed">{renderMessageText(msg.text)}</p>

                {/* Relative timestamp */}
                {msg.timestamp && <MessageTimestamp timestamp={msg.timestamp} />}

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
                      border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)",
                    }}
                  >
                    <span>✕</span> Recommendation Dismissed
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Narrated Status Loading Indicator */}
        {loadingText && (
          <div className="flex justify-start animate-pulse">
            <div
              className="rounded-2xl rounded-tl-none p-3.5 text-xs text-blue-400 flex items-center gap-2.5 shadow-inner"
              style={{
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
                border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
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

      {/* Quick suggestions area - horizontal scroll flex box */}
      <div
        className="px-4 py-2 flex flex-nowrap overflow-x-auto gap-2.5 scrollbar-thin pb-3 shrink-0"
        style={{
          background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.02)",
          borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)",
        }}
      >
        {[
          { label: "📅 Sync Calendar", prompt: "Sync my calendar events for tomorrow" },
          { label: "📨 Extension Email", prompt: "Draft an extension request email to Prof. Sharma" },
          { label: "🔍 Check Conflicts", prompt: "Check for any scheduling conflicts today" },
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(chip.prompt)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
            style={{
              border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.07)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(0,0,0,0.03)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Chat panel bottom input bar */}
      <div
        className="p-3 backdrop-blur-md shrink-0"
        style={{
          borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--border)",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        }}
      >
        <div
          className="flex gap-2 items-center rounded-2xl px-3 py-2 transition-all"
          style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
            border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid var(--border)",
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
            aria-label="Ask ActionMate AI assistant"
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
  );
}
