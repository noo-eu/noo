import { NextRequest } from "next/server";
import { oidcAuthorization } from "../authorization";
import { HttpRequest } from "@/lib/http/request";

export async function GET(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest.queryParams, undefined, request);
}

export async function POST(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(await httpRequest.formParams, undefined, request);
}
