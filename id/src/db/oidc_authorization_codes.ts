import { eq } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcAuthorizationCode(
  attributes: typeof schema.oidcAuthorizationCodes.$inferInsert,
) {
  return (
    await db
      .insert(schema.oidcAuthorizationCodes)
      .values(attributes)
      .returning()
  ).pop()!;
}

export async function findOidcAuthorizationCode(id: string) {
  return db.query.oidcAuthorizationCodes.findFirst({
    where: eq(schema.oidcAuthorizationCodes.id, id),
  });
}

export async function deleteOidcAuthorizationCode(id: string) {
  return db
    .delete(schema.oidcAuthorizationCodes)
    .where(eq(schema.oidcAuthorizationCodes.id, id));
}

const OidcAuthorizationCodes = {
  find: findOidcAuthorizationCode,
  create: createOidcAuthorizationCode,
  delete: deleteOidcAuthorizationCode,
};

export default OidcAuthorizationCodes;
export type OidcAuthorizationCode =
  typeof schema.oidcAuthorizationCodes.$inferSelect;
