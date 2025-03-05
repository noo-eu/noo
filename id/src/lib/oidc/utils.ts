import { getVerifyingKeyByAlg } from "@/app/oidc/jwks";
import * as jose from "jose";
import { cookies } from "next/headers";
import { AuthorizationRequest } from "./authorization";

const OIDC_AUTH_COOKIE_NAME = "oidc_authorization_request";
const OIDC_AUTH_COOKIE_ALG = "EdDSA";

export async function getOidcAuthorizationRequest() {
  const cookieStore = await cookies();
  const oidcAuthRequestCookie = cookieStore.get(OIDC_AUTH_COOKIE_NAME)?.value;
  if (!oidcAuthRequestCookie) {
    return null;
  }

  // URL-decode the cookie value
  const oidcAuthRequest = decodeURIComponent(oidcAuthRequestCookie);

  // Verify the signature
  const result = await decode(oidcAuthRequest);

  // TODO: might want to double-check the issuer and audience here

  return result?.payload as AuthorizationRequest | null;
}

export async function deleteOidcAuthorizationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("oidc_authorization_request");
}

async function decode(token: string) {
  try {
    const { key } = (await getVerifyingKeyByAlg(OIDC_AUTH_COOKIE_ALG))!;
    return await jose.jwtVerify(token, key);
  } catch (e) {
    console.error(e);
    return null;
  }
}
