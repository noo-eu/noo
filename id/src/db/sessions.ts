import db, { schema } from ".";
import { eq, inArray } from "drizzle-orm";

export function findSessionById(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
}

export function findSessionByIds(sessionIds: string[]) {
  return db.query.sessions.findMany({
    where: inArray(schema.sessions.id, sessionIds),
  });
}

export function createSession(attributes: typeof schema.sessions.$inferInsert) {
  return db.insert(schema.sessions).values(attributes);
}

export function refreshSession(
  sessionId: string,
  ip: string,
  userAgent: string,
) {
  return db
    .update(schema.sessions)
    .set({
      ip,
      userAgent,
      lastUsedAt: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId));
}

export function deleteSession(sessionId: string) {
  return db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}
