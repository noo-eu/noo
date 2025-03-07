import { eq, inArray, SQL } from "drizzle-orm";
import db, { schema } from ".";

export function find(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
    with: { user: { with: { tenant: true } } },
  });
}

export function findSessionByIds(sessionIds: string[]) {
  return db.query.sessions.findMany({
    where: inArray(schema.sessions.id, sessionIds),
  });
}

export async function findBy(conditions: SQL) {
  return db.query.sessions.findMany({
    where: conditions,
    with: { user: { with: { tenant: true } } },
  });
}

export async function createSession(
  attributes: typeof schema.sessions.$inferInsert,
) {
  return (
    await db.insert(schema.sessions).values(attributes).returning()
  ).pop()!;
}

export function refreshSession(
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

export function deleteSession(sessionId: string) {
  return db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

const Sessions = {
  find,
  findBy,
  create: createSession,
  delete: deleteSession,
  schema: schema.sessions,
};

export default Sessions;
export type Session = NonNullable<Awaited<ReturnType<typeof Sessions.find>>>;
