import { HttpRequest } from "@/lib/http/request";
import { oidcAuthorization } from "@/lib/oidc/authorization";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest, undefined);
}

export async function POST(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest, undefined);
}
