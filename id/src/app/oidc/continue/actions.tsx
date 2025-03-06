"use server";

import OidcClients from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import Users from "@/db/users";
import {
  Claims,
  createCode,
  returnToClientUrl,
} from "@/lib/oidc/authorization";
import {
  deleteOidcAuthorizationCookie,
  getOidcAuthorizationRequest,
} from "@/lib/oidc/utils";
import {
  getSessionCookie,
  SESSION_CHECK_COOKIE_NAME,
  SessionsService,
} from "@/lib/SessionsService";
import { humanIdToUuid, sha256 } from "@/utils";
import { cookies } from "next/headers";
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
  const user = await Users.find(session.userId);
  if (!client || !user) {
    return notFound();
  }

  if (client.tenantId && client.tenantId !== user.tenantId) {
    return notFound();
  }

  await storeConsent(
    session.userId,
    clientId,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  const code = await createCode(session, oidcAuthRequest);

  await deleteOidcAuthorizationCookie();

  const url = returnToClientUrl(oidcAuthRequest, {
    code: code.id,
    session_state: await buildSessionState(
      oidcAuthRequest.client_id,
      oidcAuthRequest.redirect_uri,
    ),
  });
  if (url) {
    return redirect(url);
  } else if (oidcAuthRequest.response_mode === "form_post") {
    throw new Error("form_post not implemented for all scenarios");
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

export async function buildSessionState(clientId: string, redirectUri: string) {
  const cookieStore = await cookies();
  const checkCookie = cookieStore.get(SESSION_CHECK_COOKIE_NAME)?.value;
  if (!checkCookie) {
    throw new Error("No check session cookie found");
  }

  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64url",
  );

  const origin = new URL(redirectUri).origin;
  const state = clientId + " " + origin + " " + checkCookie + " " + salt;

  return `${sha256(state).digest("base64url")}.${salt}`;
}

async function storeConsent(
  userId: string,
  clientId: string,
  scopes: string[],
  claims: Claims,
) {
  const claimKeys = Array.from(
    new Set(
      Object.keys(claims.userinfo || {}).concat(
        Object.keys(claims.id_token || {}),
      ),
    ),
  );

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
