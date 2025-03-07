import { tenants } from "@/db/schema";
import Tenants from "@/db/tenants";
import { eq } from "drizzle-orm";

export async function getTenant(params: Promise<{ domain: string }>) {
  const domain = (await params).domain;
  return await Tenants.findBy(eq(tenants.domain, domain));
}
