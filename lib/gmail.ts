/**
 * Gmail API utility wrapper functions.
 * Uses standard fetch with delegated client OAuth access token.
 */

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
  };
}

export async function draftGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<GmailDraft> {
  // If using a simulated sandbox token, return mock draft properties
  if (accessToken === "mock-sandbox-token" || accessToken === "mock-token-refresh" || accessToken.startsWith("mock-")) {
    return {
      id: `mock-draft-${Date.now()}`,
      message: {
        id: `mock-msg-${Date.now()}`,
        threadId: `mock-thread-${Date.now()}`,
      },
    };
  }

  const url = `https://www.googleapis.com/gmail/v1/users/me/drafts`;

  // Build simple RFC 2822 MIME message
  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
  ].join("\r\n");

  // Base64URL encode the MIME message
  const encodedMime = Buffer.from(mimeMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const payload = {
    message: {
      raw: encodedMime,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let cleanErr = `${response.status}: Failed to create Gmail draft`;
    try {
      const errText = await response.text();
      const errJson = JSON.parse(errText);
      const msg =
        errJson?.error?.message ||
        errJson?.error?.errors?.[0]?.message ||
        errJson?.message ||
        errText;
      cleanErr = `${response.status}: ${msg}`;
    } catch { /* ignore parse errors */ }
    throw new Error(`Gmail draft failed — ${cleanErr}`);
  }

  return response.json();
}
