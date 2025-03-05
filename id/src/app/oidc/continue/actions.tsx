"use server";

import OidcConsents from "@/db/oidc_consents";
import {
  Claims,
  createCode,
  returnToClientUrl,
} from "@/lib/oidc/authorization";
import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { humanIdToUuid } from "@/utils";
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
    humanIdToUuid(oidcAuthRequest.client_id, "oidc")!,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  const code = await createCode(session, oidcAuthRequest);

  const url = returnToClientUrl(oidcAuthRequest, {
    code: code.id,
    session_state: "asdasd",
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
