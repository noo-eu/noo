import { eq } from "drizzle-orm";
import db, { schema } from ".";

export async function createOidcClient(
  attributes: typeof schema.oidcClients.$inferInsert,
) {
  return (
    await db.insert(schema.oidcClients).values(attributes).returning()
  ).pop()!;
}

export async function findOidcClient(id: string) {
  return db.query.oidcClients.findFirst({
    where: eq(schema.oidcClients.id, id),
  });
}

const OidcClients = {
  find: findOidcClient,
  create: createOidcClient,
};

export default OidcClients;
export type OidcClient = typeof schema.oidcClients.$inferSelect;
