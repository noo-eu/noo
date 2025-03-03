import { and, eq, isNull } from "drizzle-orm";
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

export async function findOidcClientWithTenant(id: string, tenantId?: string) {
  return db.query.oidcClients.findFirst({
    where: and(
      eq(schema.oidcClients.id, id),
      tenantId
        ? eq(schema.oidcClients.tenantId, tenantId)
        : isNull(schema.oidcClients.tenantId),
    ),
  });
}

const OidcClients = {
  find: findOidcClient,
  findWithTenant: findOidcClientWithTenant,
  create: createOidcClient,
};

export default OidcClients;
export type OidcClient = typeof schema.oidcClients.$inferSelect;
