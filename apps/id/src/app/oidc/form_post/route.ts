// Fallback handler used by Next.js to handle form_post responses that cannot be
// handled inline in a server action and need to be redirected to a separate
// page.

import { HttpRequest } from "@/lib/http/request";
import { buildFormPostResponse } from "@/lib/oidc/authorization/formPost";

export async function GET(raw: Request) {
  const request = new HttpRequest(raw);
  const uri = request.queryParams.redirect_uri;
  const params = JSON.parse(request.queryParams.params);

  return await buildFormPostResponse(uri, params);
}
