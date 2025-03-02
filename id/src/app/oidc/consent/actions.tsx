"use server";

import { getCurrentSession, getCurrentUser } from "@/app/page";
import { createOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function getOidcAuthorizationCookie(
  cookieStore: ReadonlyRequestCookies,
) {
  const oidcAuthRequestCookie = cookieStore.get(
    "oidc_authorization_request",
  )?.value;
  if (!oidcAuthRequestCookie) {
    return null;
  }

  console.warn("oidcAuthRequestCookie", oidcAuthRequestCookie);

  try {
    // URL-decode the cookie value
    const oidcAuthRequest = decodeURIComponent(oidcAuthRequestCookie);
    return JSON.parse(oidcAuthRequest);
  } catch {
    return null;
  }
}

export async function afterConsent(cookieStore: ReadonlyRequestCookies) {
  const oidcAuthRequest = await getOidcAuthorizationCookie(cookieStore);
  if (!oidcAuthRequest) {
    return {};
  }

  const session = await getCurrentSession();
  if (!session) {
    return notFound();
  }

  const code = await createOidcAuthorizationCode({
    id: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
      "base64url",
    ),
    clientId: oidcAuthRequest.client_id,
    userId: session.userId,
    redirectUri: oidcAuthRequest.redirect_uri,
    scopes: oidcAuthRequest.scope.split(" "),
    claims: oidcAuthRequest.claims,
    nonce: oidcAuthRequest.nonce,
    authTime: session.lastAuthenticatedAt,
    data: oidcAuthRequest,
  });

  return redirect(
    `${oidcAuthRequest.redirect_uri}?code=${code.id}&state=${oidcAuthRequest.state}`,
  );
}

export async function consentFormSubmit(_: unknown, formData: FormData) {
  const consent = formData.get("consent") as string;
  if (consent !== "yes") {
    return notFound();
  }

  return afterConsent(await cookies());
}
