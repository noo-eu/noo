"use server";

import OidcClients from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { returnToClientUrl } from "@/lib/oidc/authorization";
import { buildAuthorizationResponse } from "@/lib/oidc/authorization/response";
import { Claims } from "@/lib/oidc/types";
import {
  deleteOidcAuthorizationCookie,
  getOidcAuthorizationRequest,
} from "@/lib/oidc/utils";
import { getSessionCookie, SessionsService } from "@/auth/SessionsService";
import { humanIdToUuid } from "@/utils";
import { notFound, redirect } from "next/navigation";

export async function afterConsent(sessionId: string) {
  "use server";

  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    return {};
  }

  const sessionManager = new SessionsService(await getSessionCookie());
  const session = await sessionManager.getSessionBySid(sessionId);
  if (!session) {
    return notFound();
  }

  const clientId = humanIdToUuid(oidcAuthRequest.client_id, "oidc")!;
  const client = await OidcClients.find(clientId);
  if (!client) {
    return notFound();
  }

  const user = session.user;
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
    client,
    oidcAuthRequest,
    session,
  );

  const url = returnToClientUrl(oidcAuthRequest, responseParams);

  if (url) {
    return redirect(url);
  } else if (oidcAuthRequest.response_mode === "form_post") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(responseParams));

    return redirect(
      `/oidc/form_post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
    );
  } else {
    throw new Error("unsupported response_mode");
  }
}

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent(sessionId);
}

async function storeConsent(
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
