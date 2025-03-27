"use server";

import { getAuthenticatedSession } from "@/auth/sessions";
import OidcClients from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { dbClientToClient, dbSessionToSession } from "@/lib/oidc/interface";
import "@/lib/oidc/setup";
import {
  deleteOidcAuthorizationCookie,
  getOidcAuthorizationRequest,
} from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { returnToClient } from "@noo/oidc-server/authorization/finish";
import { buildAuthorizationResponse } from "@noo/oidc-server/authorization/response";
import { Claims } from "@noo/oidc-server/types";
import { notFound, redirect } from "next/navigation";

export async function afterConsent(userId: string) {
  "use server";

  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    return {};
  }

  const session = await getAuthenticatedSession(userId);
  if (!session) {
    return notFound();
  }

  const user = session.user;

  const clientId = humanIdToUuid(oidcAuthRequest.client_id, "oidc")!;
  const client = await OidcClients.find(clientId);
  if (!client) {
    return notFound();
  }

  if (client.tenantId && client.tenantId !== user.tenant?.id) {
    return notFound();
  }

  await storeConsent(
    user.id,
    clientId,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  await deleteOidcAuthorizationCookie();

  const responseParams = await buildAuthorizationResponse(
    oidcAuthRequest,
    dbClientToClient(client),
    dbSessionToSession(session),
  );

  const result = await returnToClient(oidcAuthRequest, responseParams);

  if (result.nextStep === "REDIRECT") {
    return redirect(result.url!);
  } else if (result.nextStep === "FORM_POST") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(responseParams));

    return redirect(
      `/oidc/form_post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
    );
  } else {
    throw new Error("unsupported nextStep");
  }
}

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const userId = formData.get("userId") as string;
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent(userId);
}

export async function storeConsent(
  userId: string,
  clientId: string,
  scopes: string[],
  claims: Claims,
) {
  const claimKeys = Object.keys({ ...claims.userinfo, ...claims.id_token });

  const existing = await OidcConsents.find(clientId, userId);
  if (existing) {
    existing.claims = Array.from(new Set(claimKeys.concat(existing.claims)));
    existing.scopes = Array.from(new Set(scopes.concat(existing.scopes)));
    await OidcConsents.update(clientId, userId, existing);
  } else {
    await OidcConsents.create({
      clientId,
      userId,
      scopes,
      claims: claimKeys,
    });
  }
}
