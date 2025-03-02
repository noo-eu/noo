"use server";

import { getCurrentSession, getCurrentUser } from "@/app/page";
import { createOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

export async function getOidcAuthorizationCookie() {
  const cookieStore = await cookies();
  console.log("anma ", cookieStore.getAll());
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

export async function afterConsent() {
  const oidcAuthRequest = await getOidcAuthorizationCookie();
  console.log("oidcAuthRequest", oidcAuthRequest);
  if (!oidcAuthRequest) {
    return {};
  }

  const user = await getCurrentUser();
  if (!user) {
    console.error("No user found");
    return notFound();
  }

  const code = await createOidcAuthorizationCode(
    oidcAuthRequest.client_id,
    (await getCurrentSession()).id,
    oidcAuthRequest,
  );

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
