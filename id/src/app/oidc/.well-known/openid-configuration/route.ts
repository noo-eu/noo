import { buildConfiguration } from "@/app/oidc/configuration";
import { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  return Response.json(buildConfiguration(request));
}
