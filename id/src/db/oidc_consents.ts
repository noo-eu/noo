import { and, eq } from "drizzle-orm";
import db, { schema } from ".";

export async function findOidcConsent(clientId: string, userId: string) {
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

export async function find(clientId: string, userId: string) {
  return await db.query.oidcConsents.findFirst({
    where: and(
      eq(schema.oidcConsents.clientId, clientId),
      eq(schema.oidcConsents.userId, userId),
    ),
  });
}

export async function create(
  attributes: typeof schema.oidcConsents.$inferInsert,
) {
  return await db.insert(schema.oidcConsents).values(attributes);
}

export async function update(
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
  findOrInitialize: findOidcConsent,
  create,
  update,
};

export default OidcConsents;
