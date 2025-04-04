import { and, eq, gt } from "drizzle-orm";
import db, { schema } from ".";

async function create(params: typeof schema.oidcAccessTokens.$inferInsert) {
  return (
    await db.insert(schema.oidcAccessTokens).values(params).returning()
  ).pop()!;
}

async function find(id: string) {
  if (!/^[0-9a-f-]{36}$/.exec(id)) {
    return null;
  }

  return db.query.oidcAccessTokens.findFirst({
    where: and(
      eq(schema.oidcAccessTokens.id, id),
      gt(schema.oidcAccessTokens.expiresAt, new Date()),
    ),
  });
}

async function destroy(id: string) {
  return db
    .delete(schema.oidcAccessTokens)
    .where(eq(schema.oidcAccessTokens.id, id));
}

const OidcAccessTokens = {
  find,
  create,
  destroy,
};

export default OidcAccessTokens;
export type OidcAccessToken = typeof schema.oidcAccessTokens.$inferSelect;
