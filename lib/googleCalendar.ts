/**
 * Google Calendar API utility wrapper functions.
 * Uses standard fetch with delegated client OAuth access token.
 */

export interface CalendarEvent {
  summary: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  description?: string;
  id?: string;
}

/** Extract a human-readable error message from a Google API error response body */
async function extractGoogleApiError(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    const json = JSON.parse(text);
    const msg =
      json?.error?.message ||
      json?.error?.errors?.[0]?.message ||
      json?.message ||
      text;
    return `${response.status}: ${msg}`;
  } catch {
    return `${response.status}: ${fallback}`;
  }
}

export async function checkCalendarAvailability(
  accessToken: string,
  dateRangeStart: string, // YYYY-MM-DD
  dateRangeEnd: string    // YYYY-MM-DD
): Promise<Array<{ start: string; end: string }>> {
  // If using a simulated sandbox token, return dummy busy slots
  if (accessToken === "mock-sandbox-token" || accessToken === "mock-token-refresh" || accessToken.startsWith("mock-")) {
    return [
      { start: `${dateRangeStart}T14:00:00+05:30`, end: `${dateRangeStart}T15:30:00+05:30` },
      { start: `${dateRangeStart}T16:00:00+05:30`, end: `${dateRangeStart}T17:00:00+05:30` }
    ];
  }

  // Use explicit IST offset (+05:30) so that midnight IST = 18:30 UTC of previous day.
  // This ensures early-morning IST events (e.g. 5 AM) are never missed.
  const timeMin = new Date(`${dateRangeStart}T00:00:00+05:30`).toISOString();
  const timeMax = new Date(`${dateRangeEnd}T23:59:59+05:30`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errMsg = await extractGoogleApiError(response, "Failed to list calendar events");
    throw new Error(`Google Calendar availability check failed — ${errMsg}`);
  }

  const data = await response.json();
  const events = data.items || [];

  // Map busy events to simplified slots for Gemini
  return events.map((event: any) => ({
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    summary: event.summary,
  }));
}

export async function blockCalendarSlot(
  accessToken: string,
  title: string,
  startTime: string, // ISO datetime e.g., 2025-06-30T14:00:00+05:30
  endTime: string,   // ISO datetime
  description?: string
): Promise<CalendarEvent> {
  // If using a simulated sandbox token, return mock calendar event
  if (accessToken === "mock-sandbox-token" || accessToken === "mock-token-refresh" || accessToken.startsWith("mock-")) {
    return {
      id: `mock-event-${Date.now()}`,
      summary: title,
      start: { dateTime: startTime, timeZone: "Asia/Kolkata" },
      end: { dateTime: endTime, timeZone: "Asia/Kolkata" },
      description: description || "Scheduled by ActionMate AI (Simulated)",
    };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const eventPayload: CalendarEvent = {
    summary: title,
    start: {
      dateTime: startTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endTime,
      timeZone: "Asia/Kolkata",
    },
    description: description || "Scheduled by ActionMate AI",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errMsg = await extractGoogleApiError(response, "Failed to create calendar event");
    throw new Error(`Calendar scheduling failed — ${errMsg}. Please check the time format or try a different slot.`);
  }

  return response.json();
}

/**
 * Delete a Google Calendar event by its event ID.
 * Used during conflict resolution to remove old events before creating rescheduled ones.
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  // Skip deletion for mock/offline tokens
  if (
    accessToken === "mock-sandbox-token" ||
    accessToken === "mock-token-refresh" ||
    accessToken.startsWith("mock-")
  ) {
    console.log(`[Mock] Skipping deletion of event ${eventId} (sandbox mode)`);
    return;
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // 204 No Content = success, 404 = already deleted (both are fine)
  if (!response.ok && response.status !== 404) {
    const errMsg = await extractGoogleApiError(response, "Failed to delete calendar event");
    throw new Error(`Calendar event deletion failed — ${errMsg}`);
  }

  console.log(`Deleted Google Calendar event: ${eventId}`);
}

/**
 * Find and delete any existing Google Calendar events with the same title on a specific date.
 * Used during conflict resolution or rescheduling when taskIds might mismatch but names match.
 */
export async function deleteEventsByTitleAndDate(
  accessToken: string,
  title: string,
  eventDate: string // YYYY-MM-DD
): Promise<number> {
  if (
    accessToken === "mock-sandbox-token" ||
    accessToken === "mock-token-refresh" ||
    accessToken.startsWith("mock-")
  ) {
    return 0;
  }

  // Query events for the entire day of the event (IST timezone)
  const timeMin = new Date(`${eventDate}T00:00:00+05:30`).toISOString();
  const timeMax = new Date(`${eventDate}T23:59:59+05:30`).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin
  )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errMsg = await extractGoogleApiError(response, "Failed to search calendar events");
    console.warn(`Could not check calendar for duplicate events: ${errMsg}`);
    return 0;
  }

  const data = await response.json();
  const events = data.items || [];
  let deletedCount = 0;

  for (const event of events) {
    if (
      event.summary &&
      event.summary.trim().toLowerCase() === title.trim().toLowerCase()
    ) {
      if (event.id) {
        console.log(`Auto-cleanup: Deleting existing conflicting event "${event.summary}" (ID: ${event.id}) on ${eventDate}`);
        await deleteCalendarEvent(accessToken, event.id);
        deletedCount++;
      }
    }
  }

  return deletedCount;
}


