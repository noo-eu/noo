import { eq } from "drizzle-orm";
import db, { schema } from ".";

function find(sessionId: string) {
  return db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
}

async function create(attributes: typeof schema.sessions.$inferInsert) {
  return (
    await db.insert(schema.sessions).values(attributes).returning()
  ).pop()!;
}

const Sessions = {
  find,
  create,
};

export default Sessions;
export type Session = NonNullable<Awaited<ReturnType<typeof Sessions.find>>>;
