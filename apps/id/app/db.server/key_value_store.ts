import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import db, { schema } from ".";

async function get(key: string) {
  const row = await db.query.kv.findFirst({
    where: and(
      eq(schema.kv.key, key),
      or(isNull(schema.kv.expiresAt), gt(schema.kv.expiresAt, new Date())),
    ),
  });

  return row?.value;
}

async function set(key: string, value: unknown, expiresAt?: Date) {
  return db.insert(schema.kv).values({ key, value, expiresAt });
}

async function cleanup() {
  return db.delete(schema.kv).where(lt(schema.kv.expiresAt, new Date()));
}

const KeyValueStore = {
  get,
  set,
  cleanup,
};

export default KeyValueStore;
export type KV = typeof schema.kv.$inferSelect;
