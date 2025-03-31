import { HttpRequest } from "@/lib/http/request";
import "@/lib/oidc/setup";
import { NextRequest } from "next/server";
import { oidcAuthorization } from "../utils";

export async function GET(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest);
}

export async function POST(request: NextRequest) {
  const httpRequest = new HttpRequest(request);
  return oidcAuthorization(httpRequest);
}
