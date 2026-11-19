/**
 * Signed session tokens.
 *
 * A session is a small JSON payload (user id, role, expiry) encoded as
 * base64url and signed with HMAC-SHA256 using SESSION_SECRET from .env.
 * The token is stored in an HttpOnly cookie. Because it is signed, the
 * browser cannot change its own role without the server noticing.
 *
 * This file deliberately has no Next.js imports so it can also be used
 * from proxy.ts. Cookie handling lives in session.ts.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "fas_session";

/** How long a login lasts: 7 days. */
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export type UserRole = "ADMIN" | "FACULTY";

export type SessionPayload = {
  userId: number;
  role: UserRole;
  /** Expiry as a Unix timestamp in milliseconds. */
  exp: number;
};

function secret(): string {
  const value = process.env["SESSION_SECRET"];
  if (value && value.length >= 16) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (at least 16 characters) in production.");
  }

  // Development fallback so a fresh clone works before .env is complete.
  // Tokens signed with this value are NOT secure.
  return "development-only-session-secret";
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Returns the payload if the token is genuine and not expired, else null. */
export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (
      typeof payload.userId !== "number" ||
      (payload.role !== "ADMIN" && payload.role !== "FACULTY") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Where each role lands after logging in. */
export function homeFor(role: UserRole): string {
  return role === "ADMIN" ? "/admin" : "/faculty";
}
