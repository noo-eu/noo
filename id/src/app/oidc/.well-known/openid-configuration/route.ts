import { buildConfiguration } from "@/app/oidc/configuration";

export function GET(request) {
  return Response.json(buildConfiguration(request));
}
