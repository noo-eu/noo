"use server";

import { getCurrentSession, getCurrentUser } from "@/app/page";
import { createOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
import { Session } from "@/db/sessions";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
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
    scopes: request.scope.split(" "),
    claims: request.claims,
    nonce: request.nonce,
    authTime: session.lastAuthenticatedAt,
    data: request,
  });
}

export async function afterConsent() {
  const oidcAuthRequest = await getOidcAuthorizationCookie();
  if (!oidcAuthRequest) {
    return {};
  }

  const session = await getCurrentSession();
  if (!session) {
    return notFound();
  }

  const code = await createCode(session, oidcAuthRequest);

  return redirect(
    `${oidcAuthRequest.redirect_uri}?code=${code.id}&state=${oidcAuthRequest.state}`,
  );
}

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent();
}
