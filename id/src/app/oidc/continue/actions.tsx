"use server";

import { createOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
import OidcConsents from "@/db/oidc_consents";
import { Session } from "@/db/sessions";
import { Claims } from "@/lib/oidc/authorization";
import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function getOidcAuthorizationCookie() {
  const cookieStore = await cookies();
  const oidcAuthRequestCookie = cookieStore.get(
    "oidc_authorization_request",
  )?.value;
  if (!oidcAuthRequestCookie) {
    return null;
  }

  try {
    // URL-decode the cookie value
    const oidcAuthRequest = decodeURIComponent(oidcAuthRequestCookie);
    return JSON.parse(oidcAuthRequest);
  } catch {
    return null;
  }
}

export async function createCode(session: Session, request: any) {
  return await createOidcAuthorizationCode({
    id: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
      "base64url",
    ),
    clientId: request.client_id,
    userId: session.userId,
    redirectUri: request.redirect_uri,
    scopes: request.scopes,
    claims: request.claims,
    nonce: request.nonce,
    authTime: session.lastAuthenticatedAt,
    data: request,
  });
}

export async function afterConsent(sessionId: string) {
  const oidcAuthRequest = await getOidcAuthorizationCookie();
  if (!oidcAuthRequest) {
    return {};
  }

  const sessionManager = new SessionsService(await getSessionCookie());
  const session = await sessionManager.getSessionBySid(sessionId);
  if (!session) {
    return notFound();
  }

  await storeConsent(
    session.userId,
    oidcAuthRequest.client_id,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  const code = await createCode(session, oidcAuthRequest);

  return redirect(
    `${oidcAuthRequest.redirect_uri}?code=${code.id}&state=${oidcAuthRequest.state}`,
  );
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
