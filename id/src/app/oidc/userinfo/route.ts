import { HttpRequest } from "@/lib/http/request";
import { userinfoEndpoint } from "@/lib/oidc/userinfo";

export async function GET(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return userinfoEndpoint(request);
}
