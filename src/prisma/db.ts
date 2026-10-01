/**
 * Shared Prisma database connection.
 *
 * Import `db` from this file whenever a server-side page or Server Action
 * needs to communicate with the PostgreSQL database.
 *
 * The Temporal polyfill is required by the current Prisma 8 runtime.
 * Prisma uses Temporal when generating DateTime values such as createdAt,
 * updatedAt, assignedAt, and endedAt.
 *
 * DATABASE_URL is stored in .env and must NOT be committed to GitHub.
 */

import "temporal-polyfill/full/global";
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

// Create the shared database client using the generated Prisma contract
// and the PostgreSQL connection string stored in .env.
export const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});