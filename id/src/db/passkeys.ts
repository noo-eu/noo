import { and, eq } from "drizzle-orm";
import db, { schema } from ".";

async function find(passkeyId: string) {
  return db.query.passkeys.findFirst({
    where: eq(schema.passkeys.id, passkeyId),
  });
}

async function listForUser(userId: string) {
  return db.query.passkeys.findMany({
    where: eq(schema.passkeys.userId, userId),
  });
}

async function create(attributes: typeof schema.passkeys.$inferInsert) {
  return (
    await db.insert(schema.passkeys).values(attributes).returning()
  ).pop()!;
}

async function update(
  passkeyId: string,
  attributes: Partial<typeof schema.passkeys.$inferInsert>,
) {
  return db
    .update(schema.passkeys)
    .set(attributes)
    .where(eq(schema.passkeys.id, passkeyId));
}

async function destroy(userId: string, passkeyId: string) {
  return db
    .delete(schema.passkeys)
    .where(
      and(
        eq(schema.passkeys.userId, userId),
        eq(schema.passkeys.id, passkeyId),
      ),
    );
}

const Passkeys = {
  listForUser,
  find,
  create,
  update,
  destroy,
};

export default Passkeys;
export type Passkey = typeof schema.passkeys.$inferSelect;
