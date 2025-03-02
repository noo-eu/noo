import { HttpRequest } from "@/lib/http/request";
import { tokenEndpoint } from "@/lib/oidc/token";

export async function POST(raw: Request) {
  const request = new HttpRequest(raw);
  return await tokenEndpoint(request);
}
