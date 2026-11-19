"use server";

/**
 * Server Actions shared across the site (currently just logout).
 */

import { redirect } from "next/navigation";
import { deleteSession } from "./session";

export async function logout() {
  await deleteSession();
  redirect("/login");
}
