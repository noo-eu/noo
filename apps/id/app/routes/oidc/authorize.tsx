import { humanIdToUuid } from "@noo/lib/humanIds";
import { type AuthorizationResult } from "@noo/oidc-server/authorization/request";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { getActiveSessions } from "~/auth.server/sessions";
import OidcClients from "~/db.server/oidc_clients";
import { buildFormPostResponse } from "~/lib.server/formPost";
import { dbClientToClient, dbSessionToSession } from "~/lib.server/interface";
import { setOidcAuthorizationCookie } from "~/lib.server/oidc";
import {
  buildAuthorizationResponse,
  performOidcAuthorization,
  returnToClient,
} from "~/lib.server/oidcServer";
import { localeContext } from "~/root";

export async function loader({ request, context }: LoaderFunctionArgs) {
  return await oidcAuthorization(request, context);
}

export async function action({ request, context }: ActionFunctionArgs) {
  return await oidcAuthorization(request, context);
}

async function oidcAuthorization(
  request: Request,
  context: LoaderFunctionArgs["context"],
) {
  const result = await performOidcAuthorization(request);
  if (result.isErr()) {
    return fatalError(result.error);
  }

  let response = result.value;
  response = await handleInternalApps(request, response);

  if (response.nextStep === "REDIRECT") {
    return Response.redirect(response.url!, 303);
  }

  if (response.nextStep === "FORM_POST") {
    const t = context.get(localeContext).makeT;
    return buildFormPostResponse(
      response.params.redirect_uri,
      response.data!,
      t,
    );
  }

  const cookie = await setOidcAuthorizationCookie(response.params);
  const responseArgs = { headers: { "Set-Cookie": cookie } };

  switch (response.nextStep) {
    case "SELECT_ACCOUNT":
      return redirect("/oidc/select", responseArgs);
    case "SIGN_IN":
      return redirect("/signin", responseArgs);
    case "CONFIRM":
    case "CONSENT":
      return redirect(
        `/oidc/consent?uid=${encodeURIComponent(response.userId!)}`,
        responseArgs,
      );
  }
}

async function handleInternalApps(
  request: Request,
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
  const session = (await getActiveSessions(request))[0];

  const responseParams = await buildAuthorizationResponse(
    request,
    response.params,
    dbClientToClient(client),
    dbSessionToSession(session),
  );

  // Replace the previous nextStep with the new one
  return await returnToClient(response.params, responseParams);
}

function fatalError(error: string) {
  throw redirect(`/oidc/fatal?error=${error}`, 303);
}
