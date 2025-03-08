import { eq, SQL } from "drizzle-orm";
import db, { schema } from ".";

function find(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
    with: { user: { with: { tenant: true } } },
  });
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
  return db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

const Sessions = {
  find,
  select,
  create,
  destroy,
  refresh,
};

export default Sessions;
export type Session = NonNullable<Awaited<ReturnType<typeof Sessions.find>>>;
