"use server";

import OidcConsents from "@/db/oidc_consents";
import { Claims } from "@/lib/oidc/authorization";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { afterConsent } from "../continue/actions";

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
