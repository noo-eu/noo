"use server";

import { getAuthenticatedUser } from "@/auth/sessions";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { needsConsent } from "@/lib/oidc/consent";
import {
  deleteOidcAuthorizationCookie,
  getOidcAuthorizationRequest,
} from "@/lib/oidc/utils";
import { redirect } from "next/navigation";
import { storeConsent } from "../oidc/continue/actions";
import { buildAuthorizationResponse } from "@/lib/oidc/authorization/response";
import { UserWithTenant } from "@/db/users";
import { AuthorizationRequest } from "@/lib/oidc/types";
import { returnToClientUrl } from "@/lib/oidc/authorization";

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
  if (oidcAuthRequest.tenantId && oidcAuthRequest.tenantId !== user.tenantId) {
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

  const responseParams = await buildAuthorizationResponse(
    client,
    oidcAuthRequest,
    user,
  );

  if (oidcAuthRequest.response_mode === "form_post") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(responseParams));

    return redirect(
      `/oidc/form_post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
    );
  } else {
    const url = returnToClientUrl(oidcAuthRequest, responseParams);
    if (!url) {
      throw new Error("unsupported response_mode");
    }

    return redirect(url);
  }
}
