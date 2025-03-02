import db, { schema } from ".";
import { eq, SQL } from "drizzle-orm";

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

export async function findTenantBy(conditions: SQL) {
  return db.query.tenants.findFirst({
    where: conditions,
  });
}

export async function createTenant(tenant: typeof schema.tenants.$inferInsert) {
  return (await db.insert(schema.tenants).values(tenant).returning()).pop()!;
}

const Tenants = {
  find: findTenantById,
  findBy: findTenantBy,
  create: createTenant,
};

export default Tenants;
export type Tenant = typeof schema.tenants.$inferSelect;
