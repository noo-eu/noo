import Tenants from "@/db/tenants";
import { HttpRequest } from "@/lib/http/request";
import { composeMiddleware, cors, preventCache } from "@/lib/middlewares";
import { buildFormPostResponse } from "@/lib/oidc/authorization/formPost";
import "@/lib/oidc/setup";
import { setOidcAuthorizationCookie } from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { performOidcAuthorization } from "@noo/oidc-server/authorization/request";
import { handleTokenRequest } from "@noo/oidc-server/token/request";
import { handleUserinfo } from "@noo/oidc-server/userinfo";
import { redirect } from "next/navigation";

export async function getTenant(scope: string) {
  const tenantId = humanIdToUuid(scope, "org");
  if (!tenantId) {
    return undefined;
  }

  return await Tenants.find(tenantId);
}

export async function oidcAuthorization(request: HttpRequest) {
  const result = await performOidcAuthorization(await request.params);
  if (result.isErr()) {
    return fatalError(request.baseUrl, result.error);
  }

  const response = result.value;
  if (response.nextStep === "REDIRECT") {
    return Response.redirect(response.url!, 303);
  }

  if (response.nextStep === "FORM_POST") {
    return buildFormPostResponse(response.params.redirect_uri, response.data!);
  }

  await setOidcAuthorizationCookie(response.params);

  switch (response.nextStep) {
    case "SELECT_ACCOUNT":
      redirect("/switch");
    case "SIGN_IN":
      redirect("/signin");
    case "CONFIRM":
      redirect(`/oidc/continue?uid=${response.userId!}`);
    case "CONSENT":
      redirect(`/oidc/consent?uid=${response.userId!}`);
  }
}

function fatalError(baseUrl: string, error: string) {
  return Response.redirect(`${baseUrl}/oidc/fatal?error=${error}`, 303);
}

export const tokenEndpoint = composeMiddleware(
  preventCache,
  cors(["POST"]),
  (req) => {
    return handleTokenRequest(req.request);
  },
);

export const userinfoEndpoint = composeMiddleware(
  preventCache,
  cors(["GET", "POST"]),
  async (req: HttpRequest) => handleUserinfo(req.request),
);
