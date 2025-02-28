import db, { schema } from ".";

export async function createOidcClient(
  attributes: typeof schema.oidcClients.$inferInsert,
) {
  return (
    await db.insert(schema.oidcClients).values(attributes).returning()
  ).pop()!;
}
