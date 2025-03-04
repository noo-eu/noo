import { eq } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcAccessToken(
  params: typeof schema.oidcAccessTokens.$inferInsert,
) {
  return (
    await db.insert(schema.oidcAccessTokens).values(params).returning()
  ).pop()!;
}

export async function findOidcAccessToken(id: string) {
  return db.query.oidcAccessTokens.findFirst({
    where: eq(schema.oidcAccessTokens.id, id),
  });
}

export async function deleteOidcAccessToken(id: string) {
  return db
    .delete(schema.oidcAccessTokens)
    .where(eq(schema.oidcAccessTokens.id, id));
}

const OidcAccessTokens = {
  find: findOidcAccessToken,
  create: createOidcAccessToken,
  delete: deleteOidcAccessToken,
};

export default OidcAccessTokens;
export type OidcAccessToken = typeof schema.oidcAccessTokens.$inferSelect;
