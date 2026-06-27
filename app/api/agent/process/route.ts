import { NextRequest, NextResponse } from "next/server";
import { runAgentLoop } from "@/lib/gemini";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

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

    // Default userId for unauthenticated testing
    let userId = "guest-user";

    // Attempt Firebase Token Verification
    if (authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring(7);
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (authError) {
        console.warn("Firebase ID Token verification bypassed/failed:", authError);
      }
    }

    // Run the main agent execution loop
    const { agentText, pendingActions, suggestedSubtasks } = await runAgentLoop(
      googleAccessToken,
      userMessage,
      conversationHistory || [],
      currentDatetime || new Date().toISOString()
    );

    let taskId = `task-${Date.now()}`;

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

      const newTask = {
        taskId,
        userId,
        title: userMessage.length > 60 ? `${userMessage.substring(0, 57)}...` : userMessage,
        rawInput: userMessage,
        description: agentText,
        status: pendingActions.length > 0 ? "in_progress" : "pending",
        priority,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default: 24 hours out
        deadlineText: "Tomorrow",
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

    return NextResponse.json({
      agentText,
      pendingActions,
      suggestedSubtasks,
      taskId,
    });
  } catch (error: any) {
    console.error("Agent process API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
