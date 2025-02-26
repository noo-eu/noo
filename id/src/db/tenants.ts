import db, { schema } from ".";
import { eq } from "drizzle-orm";

export async function findTenantByDomainName(domainName: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.domain, domainName),
  });
}
