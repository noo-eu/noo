"use server";

import { getCurrentUser } from "@/app/page";
import { createOidcAuthorizationCode } from "@/db/oidc_authorization_codes";
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
    return JSON.parse(oidcAuthRequestCookie);
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

  console.log("user", user);

  const code = await createOidcAuthorizationCode(
    oidcAuthRequest.client_id,
    user.id,
    oidcAuthRequest,
  );
  console.log("code", code);
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
