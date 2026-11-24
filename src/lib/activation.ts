/**
 * Activation codes: how faculty members create their own accounts.
 *
 * 1. An administrator generates a code for a faculty member on
 *    /admin/accounts (one at a time, or for everyone without an account).
 * 2. The administrator gives the code to the faculty member.
 * 3. The faculty member opens /activate, enters the code, their email and
 *    a password they choose. The account is created, linked to their
 *    faculty record, and the code is deleted.
 *
 * Codes use 8 characters from an alphabet without look-alikes (no 0/O,
 * 1/I/L), so they are easy to read out loud or copy from paper.
 */

import { randomInt } from "node:crypto";
import { Temporal } from "temporal-polyfill";
import { db } from "@/prisma/db";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 8;

/** How long a code keeps working after it is generated. */
export const CODE_VALID_DAYS = 30;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** "K7MQ4XTP" -> "K7MQ-4XTP" for display. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** What the person typed -> stored form: uppercase, no spaces or dashes. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isExpired(expiresAt: unknown): boolean {
  const expires = new Date(String(expiresAt));
  return Number.isNaN(expires.getTime()) || expires.getTime() < Date.now();
}

/**
 * Create (or replace) the activation code for one faculty member.
 * Any older code for that member stops working.
 */
export async function issueCode(facultyId: number): Promise<string> {
  await db.orm.public.ActivationCode.where({ facultyId }).deleteAndCount();

  const expiresAt = Temporal.Now.plainDateTimeISO().add({ days: CODE_VALID_DAYS });

  // A clash between two random codes is extremely unlikely; retry just in case.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const taken = await db.orm.public.ActivationCode.where({ code }).first();
    if (taken) continue;
    await db.orm.public.ActivationCode.create({ code, facultyId, expiresAt });
    return code;
  }
  throw new Error("Could not generate a unique activation code.");
}
