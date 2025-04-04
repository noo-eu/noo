import { humanIdToUuid } from "@noo/lib/humanIds";
import type { LoaderFunctionArgs } from "react-router";
import Tenants from "~/db.server/tenants";
import { discoveryMetadata } from "~/lib.server/oidcServer";

export async function loader({ params }: LoaderFunctionArgs) {
  if (params.tenantId) {
    const tenant = await Tenants.find(humanIdToUuid(params.tenantId, "org")!);
    if (!tenant) {
      return new Response("Not Found", { status: 404 });
    }

    return discoveryMetadata("tenant", "/" + params.tenantId);
  }

  return discoveryMetadata();
}
