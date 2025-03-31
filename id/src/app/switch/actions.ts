"use server";

import { getAuthenticatedSession, getAuthenticatedUser } from "@/auth/sessions";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { UserWithTenant } from "@/db/users";
import { needsConsent } from "@/lib/oidc/consent";
import { dbClientToClient, dbSessionToSession } from "@/lib/oidc/interface";
import "@/lib/oidc/setup";
import {
  deleteOidcAuthorizationCookie,
  getOidcAuthorizationRequest,
} from "@/lib/oidc/utils";
import { returnToClient } from "@noo/oidc-server/authorization/finish";
import { buildAuthorizationResponse } from "@noo/oidc-server/authorization/response";
import { AuthorizationRequest } from "@noo/oidc-server/types";
import { redirect } from "next/navigation";
import { storeConsent } from "../oidc/continue/actions";

export async function switchSubmit(uid: string) {
  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    // We must be in the context of an OIDC authorization
    redirect("/");
  }

  const client = await OidcClients.find(oidcAuthRequest.client_id);
  if (!client) {
    redirect("/");
  }

  const user = await getAuthenticatedUser(uid);
  if (!user) {
    redirect("/switch");
  }

  // Check that the user is allowed to use this OIDC client
  if (client.tenantId && client.tenantId !== user.tenantId) {
    redirect("/switch");
  }

  // Check the consent status
  const claimKeys = Object.keys({
    ...oidcAuthRequest.claims.id_token,
    ...oidcAuthRequest.claims.userinfo,
  });

  if (await needsConsent(client, user, oidcAuthRequest.scopes, claimKeys)) {
    redirect(`/oidc/consent?uid=${uid}`);
  }

  // Consent is not needed, fast forward to the authorization response
  await finishOidcAuthorization(client, user, oidcAuthRequest);
}

export async function finishOidcAuthorization(
  client: OidcClient,
  user: UserWithTenant,
  oidcAuthRequest: AuthorizationRequest,
) {
  await deleteOidcAuthorizationCookie();

  await storeConsent(
    user.id,
    client.id,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  const session = (await getAuthenticatedSession(user.id))!;

  const responseParams = await buildAuthorizationResponse(
    oidcAuthRequest,
    dbClientToClient(client),
    dbSessionToSession(session),
  );

  const result = await returnToClient(oidcAuthRequest, responseParams);

  if (result.nextStep === "FORM_POST") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(responseParams));

    return redirect(
      `/oidc/form_post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
    );
  } else {
    return redirect(result.url!);
  }
}
