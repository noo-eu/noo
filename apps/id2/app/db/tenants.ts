import { eq, SQL } from "drizzle-orm";
import db, { schema } from ".";

async function find(id: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.id, id),
  });
}

async function findBy(conditions: SQL) {
  return db.query.tenants.findFirst({
    where: conditions,
  });
}

async function create(tenant: typeof schema.tenants.$inferInsert) {
  return (await db.insert(schema.tenants).values(tenant).returning()).pop()!;
}

const Tenants = {
  find,
  findBy,
  create,
};

export default Tenants;
export type Tenant = typeof schema.tenants.$inferSelect;
