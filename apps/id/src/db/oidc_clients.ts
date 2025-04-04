import { humanIdToUuid } from "@/utils";
import { and, eq, isNull } from "drizzle-orm";
import db, { schema } from ".";

async function create(attributes: typeof schema.oidcClients.$inferInsert) {
  return (
    await db.insert(schema.oidcClients).values(attributes).returning()
  ).pop()!;
}

async function find(id: string) {
  if (id.startsWith("oidc_")) {
    id = humanIdToUuid(id, "oidc")!;
  }

  return db.query.oidcClients.findFirst({
    where: eq(schema.oidcClients.id, id),
  });
}

async function findWithTenant(id: string, tenantId?: string) {
  return db.query.oidcClients.findFirst({
    where: and(
      eq(schema.oidcClients.id, id),
      tenantId
        ? eq(schema.oidcClients.tenantId, tenantId)
        : isNull(schema.oidcClients.tenantId),
    ),
  });
}

async function destroy(id: string) {
  return db.delete(schema.oidcClients).where(eq(schema.oidcClients.id, id));
}

const OidcClients = {
  find,
  findWithTenant,
  create,
  destroy,
};

export default OidcClients;
export type OidcClient = typeof schema.oidcClients.$inferSelect;
