import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import db, { schema } from ".";

async function get<T>(key: string): Promise<T | undefined> {
  const row = await db.query.kv.findFirst({
    where: and(
      eq(schema.kv.key, key),
      or(isNull(schema.kv.expiresAt), gt(schema.kv.expiresAt, new Date())),
    ),
  });

  return row?.value as T;
}

/**
 * Set a key-value pair in the database.
 *
 * @param key unique key to store the value under. This must be unique.
 * @param value arbitrary value to store. This will be serialized to JSON.
 * @param ttl TTL in seconds. If not provided, the value will not expire.
 */
async function set(key: string, value: unknown, ttl?: number) {
  const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;

  return db
    .insert(schema.kv)
    .values({
      key,
      value,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: schema.kv.key,
      set: { value, expiresAt },
    });
}

async function destroy(key: string) {
  return db.delete(schema.kv).where(eq(schema.kv.key, key));
}

async function cleanup() {
  return db.delete(schema.kv).where(lt(schema.kv.expiresAt, new Date()));
}

const KeyValueStore = {
  get,
  set,
  destroy,
  cleanup,
};

export default KeyValueStore;
export type KV = typeof schema.kv.$inferSelect;
