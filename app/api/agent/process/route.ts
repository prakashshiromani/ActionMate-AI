import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/gemini";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getFreshGoogleAccessToken } from "@/lib/googleAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userMessage, conversationHistory, currentDatetime } = body;

    if (!userMessage) {
      return NextResponse.json({ error: "userMessage is required" }, { status: 400 });
    }

    // Extract access tokens from headers
    const googleAccessToken = req.headers.get("x-google-access-token") || "";
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
    } catch (authError) {
      console.warn("Firebase ID Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let activeGoogleAccessToken = googleAccessToken;

    // Retrieve stored refresh token from Firestore and silently get fresh access token
    if (userId !== "guest-user") {
      try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.googleRefreshToken) {
            console.log(`Silently refreshing Google token for user ${userId}...`);
            activeGoogleAccessToken = await getFreshGoogleAccessToken(userData.googleRefreshToken);
          } else {
            console.log(`User ${userId} has not enabled Silent Sync. Discarding stale header token.`);
            activeGoogleAccessToken = "";
          }
        } else {
          console.log(`User doc for ${userId} does not exist. Discarding stale header token.`);
          activeGoogleAccessToken = "";
        }
      } catch (dbErr) {
        console.warn("Bypassed silent token refresh due to Firestore error:", dbErr);
      }
    }

    // Run the main agent execution loop
    const { agentText, pendingActions, suggestedSubtasks, isTask, conflict } = await runAgentLoop(
      activeGoogleAccessToken,
      userMessage,
      conversationHistory || [],
      currentDatetime || new Date().toISOString()
    );

    let taskId = null;

    if (isTask) {
      // Write task to Firestore if Firebase Admin is initialized
      try {
        const taskRef = adminDb.collection("tasks").doc();
        taskId = taskRef.id;

        // Basic heuristic to set priority based on message content
        let priority: "high" | "medium" | "low" = "medium";
        const urgentWords = ["urgent", "jaldi", "emergency", "important", "deadline", "kal", "cal", "today", "due", "subah", "tomorrow"];
        if (urgentWords.some((word) => userMessage.toLowerCase().includes(word))) {
          priority = "high";
        }

        // Basic heuristic to parse deadline from userMessage
        let deadlineText = "Tomorrow";
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes("today")) {
          deadlineText = "Today";
        } else if (lowerMsg.includes("tomorrow")) {
          deadlineText = "Tomorrow";
        } else if (lowerMsg.includes("yesterday")) {
          deadlineText = "Yesterday";
        } else {
          const dateMatch = userMessage.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/i);
          if (dateMatch) {
            deadlineText = dateMatch[0];
          }
        }

        const newTask = {
          taskId,
          userId,
          title: userMessage.length > 60 ? `${userMessage.substring(0, 57)}...` : userMessage,
          rawInput: userMessage,
          description: agentText,
          status: pendingActions.length > 0 ? "in_progress" : "pending",
          priority,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24 hours out
          deadlineText,
          subtasks: suggestedSubtasks.map((st, index) => ({
            subtaskId: `sub-${index}`,
            title: st.title,
            estimatedMinutes: st.estimatedMinutes,
            completed: false,
            completedAt: null,
          })),
          calendarEventId: null,
          gmailDraftId: null,
          agentActions: pendingActions.map((action) => ({
            actionType: action.type,
            status: "pending_approval",
            executedAt: null,
            detail: action.displaySummary,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await taskRef.set(newTask);
      } catch (dbError) {
        console.warn("Firestore write skipped (development mock mode active):", dbError);
      }
    }

    return NextResponse.json({
      agentText,
      pendingActions,
      suggestedSubtasks: isTask ? suggestedSubtasks : [],
      taskId,
      conflict,
    });
  } catch (error: any) {
    console.error("Agent process API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
