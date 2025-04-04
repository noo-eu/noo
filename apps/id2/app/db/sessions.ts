import { humanIdToUuid } from "@noo/lib/humanIds";
import { count, eq, SQL } from "drizzle-orm";
import db, { schema } from ".";

function find(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
    with: { user: { with: { tenant: true } } },
  });
}

function findManyBy(conditions: SQL) {
  return db.query.sessions.findMany({
    where: conditions,
    with: { user: { with: { tenant: true } } },
  });
}

async function countBy(conditions: SQL) {
  return (
    await db.select({ count: count() }).from(schema.sessions).where(conditions)
  )[0].count;
}

async function select(conditions: SQL) {
  return db.query.sessions.findMany({
    where: conditions,
    with: { user: { with: { tenant: true } } },
  });
}

async function create(attributes: typeof schema.sessions.$inferInsert) {
  return (
    await db.insert(schema.sessions).values(attributes).returning()
  ).pop()!;
}

function refresh(
  sessionId: string,
  ip: string,
  userAgent: string,
  authenticatedAt?: Date,
) {
  const attributes = {
    ip,
    userAgent,
    lastUsedAt: new Date(),
    lastAuthenticatedAt: authenticatedAt,
  };

  return db
    .update(schema.sessions)
    .set(attributes)
    .where(eq(schema.sessions.id, sessionId));
}

function destroy(sessionId: string) {
  if (sessionId.startsWith("sess_")) {
    sessionId = humanIdToUuid(sessionId, "sess")!;
  }

  return db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

function destroyBy(conditions: SQL) {
  return db.delete(schema.sessions).where(conditions);
}

const Sessions = {
  find,
  findManyBy,
  countBy,
  select,
  create,
  destroy,
  destroyBy,
  refresh,
};

export default Sessions;
export type Session = NonNullable<Awaited<ReturnType<typeof Sessions.find>>>;
