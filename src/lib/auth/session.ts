/**
 * Session cookie helpers (server only).
 *
 * createSession() is called after a successful login, getSession() reads
 * the current request's cookie, and deleteSession() logs the user out.
 */

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_LIFETIME_MS,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
  type UserRole,
} from "./session-token";

export async function createSession(userId: number, role: UserRole) {
  const exp = Date.now() + SESSION_LIFETIME_MS;
  const token = createSessionToken({ userId, role, exp });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Browsers only send Secure cookies over https; local dev uses http.
    secure: process.env.NODE_ENV === "production",
    expires: new Date(exp),
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
