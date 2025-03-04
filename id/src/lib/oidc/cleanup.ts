import db from "@/db";
import { oidcAuthorizationCodes, oidcAccessTokens } from "@/db/schema";
import { lt } from "drizzle-orm";

// This file defines a long running recurring task to cleanup expired OIDC entities
// such as authorization codes and access tokens from the database.

// Remove authorization codes older than 1 minute
async function cleanupAuthorizationCodes() {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - 1);

  await db
    .delete(oidcAuthorizationCodes)
    .where(lt(oidcAuthorizationCodes.createdAt, cutoff));
}

// Remove expired access tokens
async function cleanupAccessTokens() {
  await db
    .delete(oidcAccessTokens)
    .where(lt(oidcAccessTokens.expiresAt, new Date()));
}

// This task is run every 5 minutes
async function cleanup() {
  await cleanupAuthorizationCodes();
  await cleanupAccessTokens();
}

export function startCleanupTask() {
  setInterval(cleanup, 5 * 60 * 1000);
}
