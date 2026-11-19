/**
 * Password hashing.
 *
 * Uses scrypt from Node's built-in crypto module, so no extra package is
 * needed. Each password gets its own random salt, and the stored value
 * looks like:
 *
 *   scrypt$<salt hex>$<hash hex>
 *
 * verifyPassword() compares in constant time so timing differences do not
 * leak information about the stored hash.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function runScrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await runScrypt(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await runScrypt(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Minimum rules for a new password. Returns an error message or null. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}
