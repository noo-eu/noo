import { and, eq } from "drizzle-orm";
import db, { schema } from ".";

async function findOrInitialize(clientId: string, userId: string) {
  return (
    (await find(clientId, userId)) || {
      userId,
      clientId,
      scopes: [] as string[],
      claims: [] as string[],
      createdAt: new Date(),
    }
  );
}

async function find(clientId: string, userId: string) {
  return await db.query.oidcConsents.findFirst({
    where: and(
      eq(schema.oidcConsents.clientId, clientId),
      eq(schema.oidcConsents.userId, userId),
    ),
  });
}

async function create(attributes: typeof schema.oidcConsents.$inferInsert) {
  return await db.insert(schema.oidcConsents).values(attributes);
}

async function update(
  clientId: string,
  userId: string,
  attributes: typeof schema.oidcConsents.$inferSelect,
) {
  return await db
    .update(schema.oidcConsents)
    .set(attributes)
    .where(
      and(
        eq(schema.oidcConsents.clientId, clientId),
        eq(schema.oidcConsents.userId, userId),
      ),
    );
}

const OidcConsents = {
  find,
  findOrInitialize,
  create,
  update,
};

export default OidcConsents;
