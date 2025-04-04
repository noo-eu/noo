import { getActiveSessions } from "@/auth/sessions";
import OidcClients from "@/db/oidc_clients";
import Tenants from "@/db/tenants";
import { HttpRequest } from "@/lib/http/request";
import { composeMiddleware, cors, preventCache } from "@/lib/middlewares";
import { buildFormPostResponse } from "@/lib/oidc/authorization/formPost";
import { dbClientToClient, dbSessionToSession } from "@/lib/oidc/interface";
import "@/lib/oidc/setup";
import { setOidcAuthorizationCookie } from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { returnToClient } from "@noo/oidc-server/authorization/finish";
import {
  AuthorizationResult,
  performOidcAuthorization,
} from "@noo/oidc-server/authorization/request";
import { buildAuthorizationResponse } from "@noo/oidc-server/authorization/response";
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

  let response = result.value;
  response = await handleInternalApps(response);

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

async function handleInternalApps(
  response: AuthorizationResult,
): Promise<AuthorizationResult> {
  if (response.nextStep === "SIGN_IN") {
    // Make sure sign in is performed
    return response;
  }

  const clientId = response.params.client_id;
  const client = (await OidcClients.find(humanIdToUuid(clientId, "oidc")!))!;

  if (!client.internalClient) {
    return response;
  }

  // Just redirect to the client
  const session = (await getActiveSessions())[0];

  const responseParams = await buildAuthorizationResponse(
    response.params,
    dbClientToClient(client),
    dbSessionToSession(session),
  );

  // Replace the previous nextStep with the new one
  return await returnToClient(response.params, responseParams);
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
