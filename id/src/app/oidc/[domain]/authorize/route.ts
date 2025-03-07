import { getTenant } from "@/app/oidc/utils";
import { HttpRequest } from "@/lib/http/request";
import { oidcAuthorization } from "@/lib/oidc/authorization";
import { notFound } from "next/navigation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const tenant = await getTenant(params);
  if (!tenant) {
    notFound();
  }

  return oidcAuthorization(new HttpRequest(request), tenant);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  // The behavior of POST is identical to GET
  return GET(request, { params });
}
