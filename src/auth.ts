// FragClip auth helpers: session management and cookie utilities.
// All DB calls use the server-only sql() helper from db.ts.

import { randomBytes } from "node:crypto";
import { sql } from "./db";

const SESSION_COOKIE = "fragclip_session";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

/** Generate a cryptographically random session token (hex-encoded, 64 chars). */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export interface UserRow {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
}

/**
 * Create a session for a user. Inserts a row into sessions with a 30-day
 * expiry and returns the token to set as a cookie.
 */
export async function createSession(userId: string): Promise<string> {
  const db = sql();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();

  await db`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
  `;

  return token;
}

/**
 * Extract the session token from a Request's cookie header, validate it
 * against the DB, and return the associated user row (or null).
 */
export async function getSessionFromCookie(req: Request): Promise<UserRow | null> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;

  const db = sql();
  const rows = await db`
    SELECT u.id, u.email, u.subscription_tier, u.subscription_status
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > now()
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return rows[0] as UserRow;
}

/**
 * Delete a session by token. Returns true if a row was removed.
 */
export async function deleteSession(token: string): Promise<boolean> {
  const db = sql();
  const rows = await db`
    DELETE FROM sessions WHERE token = ${token}
    RETURNING id
  `;
  return rows.length > 0;
}

/** Build a Set-Cookie header string for the session token. */
export function sessionCookieHeader(token: string, clear = false): string {
  const parts = [
    `${SESSION_COOKIE}=${clear ? "" : token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
  ];
  if (clear) {
    parts.push("Max-Age=0");
  } else {
    parts.push(`Max-Age=${SESSION_MAX_AGE_SEC}`);
  }
  return parts.join("; ");
}

/** Read a specific cookie value from a Cookie header string. */
function parseCookie(header: string, name: string): string | null {
  for (const cookie of header.split(";")) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) {
      return rest.join("=") || null;
    }
  }
  return null;
}

/** Re-export cookie name so api-handler can reference it. */
export { SESSION_COOKIE };
