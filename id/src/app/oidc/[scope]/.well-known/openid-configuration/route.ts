import { setup } from "@/lib/oidc/setup";
import { getTenant } from "@/app/oidc/utils";
import { discoveryMetadata } from "@noo/oidc-server/discovery";
import { notFound } from "next/navigation";

export async function GET(
  raw: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  setup(raw);

  const scope = (await params).scope;
  const tenant = await getTenant(scope);
  if (!tenant) {
    notFound();
  }

  return Response.json(discoveryMetadata("tenant", `/${scope}`));
}
