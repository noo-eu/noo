import Tenants from "@/db/tenants";
import { humanIdToUuid } from "@/utils";

export async function getTenant(scope: string) {
  const tenantId = humanIdToUuid(scope, "org");
  if (!tenantId) {
    return undefined;
  }

  return await Tenants.find(tenantId);
}
