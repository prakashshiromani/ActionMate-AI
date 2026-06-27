import { NextRequest, NextResponse } from "next/server";
import { blockCalendarSlot } from "@/lib/googleCalendar";
import { draftGmailEmail } from "@/lib/gmail";
import { adminDb } from "@/lib/firebaseAdmin";
import { PendingAction } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvedActions, taskId } = body;

    if (!approvedActions || !Array.isArray(approvedActions)) {
      return NextResponse.json(
        { error: "approvedActions list is required" },
        { status: 400 }
      );
    }

    const googleAccessToken = req.headers.get("x-google-access-token") || "";

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google OAuth access token is required to execute actions" },
        { status: 401 }
      );
    }

    const results: Array<{ type: string; status: "success" | "failed"; detail: string }> = [];
    let calendarEventId: string | null = null;
    let gmailDraftId: string | null = null;

    // Process all approved actions sequentially
    for (const action of approvedActions) {
      const { type, payload } = action as PendingAction;

      try {
        if (type === "CALENDAR_BLOCK") {
          const start = payload.start_time || "";
          const end = payload.end_time || "";
          const title = payload.title || "Deep Work Slot";
          const desc = payload.description || "";

          const event = await blockCalendarSlot(googleAccessToken, title, start, end, desc);
          calendarEventId = event.id || null;

          results.push({
            type,
            status: "success",
            detail: `Created calendar event: ${event.summary} (ID: ${event.id})`,
          });
        } else if (type === "GMAIL_DRAFT") {
          const to = payload.to || "recipient@example.com";
          const subject = payload.subject || "ActionMate AI Update";
          const bodyText = payload.body || "";

          const draft = await draftGmailEmail(googleAccessToken, to, subject, bodyText);
          gmailDraftId = draft.id || null;

          results.push({
            type,
            status: "success",
            detail: `Created Gmail draft ID: ${draft.id}`,
          });
        } else {
          results.push({
            type,
            status: "failed",
            detail: `Unknown action type: ${type}`,
          });
        }
      } catch (err: any) {
        console.error(`Error executing action ${type}:`, err);
        results.push({
          type,
          status: "failed",
          detail: err.message || "Failed to execute API call",
        });
      }
    }

    // Update Firestore if taskId is valid and database is available
    if (taskId) {
      try {
        const taskRef = adminDb.collection("tasks").doc(taskId);
        const taskDoc = await taskRef.get();

        if (taskDoc.exists) {
          // Update the task status to scheduled/in_progress, record calendar/gmail IDs,
          // and mark action rows as executed
          const currentActions = taskDoc.data()?.agentActions || [];
          const updatedActions = currentActions.map((act: any) => {
            const executedMatch = results.find(
              (r) => r.type === act.actionType && r.status === "success"
            );
            if (executedMatch) {
              return {
                ...act,
                status: "executed",
                executedAt: new Date(),
              };
            }
            const failedMatch = results.find(
              (r) => r.type === act.actionType && r.status === "failed"
            );
            if (failedMatch) {
              return {
                ...act,
                status: "failed",
              };
            }
            return act;
          });

          await taskRef.update({
            status: "scheduled",
            calendarEventId: calendarEventId || taskDoc.data()?.calendarEventId || null,
            gmailDraftId: gmailDraftId || taskDoc.data()?.gmailDraftId || null,
            agentActions: updatedActions,
            updatedAt: new Date(),
          });
        }
      } catch (dbError) {
        console.warn("Firestore update skipped (development mock mode active):", dbError);
      }
    }

    return NextResponse.json({
      success: results.every((r) => r.status === "success"),
      results,
    });
  } catch (error: any) {
    console.error("Action execution error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
