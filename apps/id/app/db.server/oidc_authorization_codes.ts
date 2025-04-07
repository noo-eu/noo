import { eq } from "drizzle-orm";
import db, { schema } from ".";

async function create(
  attributes: typeof schema.oidcAuthorizationCodes.$inferInsert,
) {
  return (
    await db
      .insert(schema.oidcAuthorizationCodes)
      .values(attributes)
      .returning()
  ).pop()!;
}

async function find(id: string) {
  return db.query.oidcAuthorizationCodes.findFirst({
    where: eq(schema.oidcAuthorizationCodes.id, id),
  });
}

async function destroy(id: string) {
  return db
    .delete(schema.oidcAuthorizationCodes)
    .where(eq(schema.oidcAuthorizationCodes.id, id));
}

const OidcAuthorizationCodes = {
  find: find,
  create: create,
  destroy: destroy,
};

export default OidcAuthorizationCodes;
export type OidcAuthorizationCode =
  typeof schema.oidcAuthorizationCodes.$inferSelect;
