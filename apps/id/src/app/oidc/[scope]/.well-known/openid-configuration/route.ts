import { getTenant } from "@/app/oidc/utils";
import "@/lib/oidc/setup";
import { discoveryMetadata } from "@noo/oidc-server/discovery";
import { notFound } from "next/navigation";

export async function GET(
  raw: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const scope = (await params).scope;
  const tenant = await getTenant(scope);
  if (!tenant) {
    notFound();
  }

  return Response.json(discoveryMetadata("tenant", `/${scope}`));
}
