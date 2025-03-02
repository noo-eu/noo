import db, { schema } from ".";
import { eq } from "drizzle-orm";

export async function findTenantByDomainName(domainName: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.domain, domainName),
  });
}

export async function findTenantById(id: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.id, id),
  });
}

export async function createTenant(tenant: typeof schema.tenants.$inferInsert) {
  return (await db.insert(schema.tenants).values(tenant).returning()).pop()!;
}
