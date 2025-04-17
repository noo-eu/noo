import { sql } from "drizzle-orm";
import db from ".";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

/**
 * Acquire a lock using PostgreSQL transaction level advisory locks.
 *
 * TXN level advisory locks are released automatically at the end of the
 * transaction, and there's no mechanism to release them manually.
 *
 * @param tx - The transaction to use. This must be a transaction that has been
 *    started with `db.transaction()`.
 * @param lockId - The lock ID. This is a 64-bit number.
 * @param namespace - The namespace for the lock. This is a 4-bit number. When
 *    namespace is used, the first 4 bits of the lock ID must be set to 0.
 * @returns returns once the lock is acquired.
 */
export async function acquireLock(
  tx: PgTransaction<NodePgQueryResultHKT>,
  lockId: number,
  namespace?: number,
) {
  // We have 64 bits for the lock. Postgres allows us to give a single 64-bit
  // number or two 32-bit numbers.

  // If the namespace is used, the first 4 bits are reserved for the namespace.
  if (typeof namespace === "number") {
    if (lockId > 0x0fff_ffff_ffff_ffff) {
      throw new Error("Lock ID must be less than 60 bits");
    }

    if (namespace > 15) {
      throw new Error("Namespace must be less than 16");
    }

    lockId = (namespace << 60) | lockId;
  }

  const query = sql`SELECT pg_advisory_xact_lock(${lockId})`;
  return await tx.execute(query);
}

/**
 * Acquire a lock using PostgreSQL transaction level advisory locks, and using
 * an UUID as the lock ID.
 *
 * The UUID will be truncated to a 60 or 64-bit number. This should be ok if the
 * UUIDs have been generated using a cryptographically secure random number
 * generator. Otherwise you may want to sha256 the UUID and use the first 8
 * bytes.
 *
 * @param tx - The transaction to use. This must be a transaction that has been
 *    started with `db.transaction()`.
 * @param lockId - The lock ID. This must be an UUID.
 * @param namespace - The namespace for the lock. This is a 4-bit number. When
 *    namespace is used, the lock ID is truncated to 60 bits.
 * @returns returns once the lock is acquired.
 */
export function acquireLockWithUUID(
  tx: PgTransaction<NodePgQueryResultHKT>,
  lockId: string,
  namespace?: number,
) {
  // Split by "-" and take the last two parts.
  const parts = lockId.split("-");
  let lockIdStr = `${parts[parts.length - 2]}${parts[parts.length - 1]}`;

  // Get 64 bits from the UUID.
  let lockIdNum = parseInt(lockIdStr, 16);
  if (typeof namespace === "number") {
    // Remove the top 4 bits.
    lockIdNum = lockIdNum & ~(0xf << 60);
  }

  return acquireLock(tx, lockIdNum, namespace);
}

// Lock namespace used for TOTP rate limiting.
export const TOTP_LOCK_NAMESPACE = 0x1;
