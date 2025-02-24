import { buildConfiguration } from "@/app/oidc/configuration";

export async function GET(request, { params }) {
  const domain = (await params).domain;
  return Response.json(buildConfiguration(request, domain));
}
