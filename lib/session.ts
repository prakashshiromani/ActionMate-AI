const ENC = new TextEncoder();
const DEC = new TextDecoder();

async function getHmacKey(): Promise<CryptoKey> {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
    "actionmate-dev-secret-change-in-prod";
  return crypto.subtle.importKey(
    "raw",
    ENC.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64url(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Creates a signed session token: base64url(payload).base64url(hmac)
export async function createSessionToken(uid: string): Promise<string> {
  const ts = Date.now().toString(36);
  const payload = `${uid}.${ts}`;
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, ENC.encode(payload));
  return `${toBase64url(ENC.encode(payload))}.${toBase64url(sig)}`;
}

// Returns uid if token is valid and not expired, otherwise null
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;

    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);
    const payloadBytes = fromBase64url(payloadB64);
    const sigBytes = fromBase64url(sigB64);

    const key = await getHmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes as any, payloadBytes as any);
    if (!valid) return null;

    const payload = DEC.decode(payloadBytes);
    const [uid, tsBase36] = payload.split(".");
    if (!uid || !tsBase36) return null;

    const ts = parseInt(tsBase36, 36);
    if (isNaN(ts) || Date.now() - ts > 86_400_000) return null; // 24h expiry

    return uid;
  } catch {
    return null;
  }
}
