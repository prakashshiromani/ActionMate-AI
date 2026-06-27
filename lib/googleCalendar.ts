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

  // Convert date strings to ISO full datetimes for the API (start of day to end of day)
  const timeMin = new Date(`${dateRangeStart}T00:00:00`).toISOString();
  const timeMax = new Date(`${dateRangeEnd}T23:59:59`).toISOString();

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
    const errText = await response.text();
    throw new Error(`Google Calendar API list error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const events = data.items || [];

  // Map busy events slots to simplify availability check for Gemini
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
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      description: description || "Scheduled by ActionMate AI (Simulated)",
    };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const eventPayload: CalendarEvent = {
    summary: title,
    start: {
      dateTime: startTime,
    },
    end: {
      dateTime: endTime,
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
    const errText = await response.text();
    throw new Error(`Google Calendar API insert error: ${response.status} - ${errText}`);
  }

  return response.json();
}
