import { and, eq, gt } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcAccessToken(
  params: typeof schema.oidcAccessTokens.$inferInsert,
) {
  return (
    await db.insert(schema.oidcAccessTokens).values(params).returning()
  ).pop()!;
}

export async function findOidcAccessToken(id: string) {
  if (!id.match(/^[0-9a-f-]{36}$/)) {
    return null;
  }

  return db.query.oidcAccessTokens.findFirst({
    where: and(
      eq(schema.oidcAccessTokens.id, id),
      gt(schema.oidcAccessTokens.expiresAt, new Date()),
    ),
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
