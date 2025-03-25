import * as jose from "jose";
import { cookies } from "next/headers";
import { AuthorizationRequest } from "./types";
import { getSigningKey, getVerifyingKeyForJwt } from "../jwks";

const OIDC_AUTH_COOKIE_NAME = "oidc_authorization_request";

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

export async function setOidcAuthorizationCookie(
  request: AuthorizationRequest,
) {
  const signedParams = await signParams(request);

  return `${OIDC_AUTH_COOKIE_NAME}=${signedParams}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

export async function deleteOidcAuthorizationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("oidc_authorization_request");
}

async function signParams(params: AuthorizationRequest) {
  const { key, kid } = (await getSigningKey("EdDSA"))!;
  return await new jose.SignJWT(params)
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

async function decode(token: string) {
  try {
    return await jose.jwtVerify(token, getVerifyingKeyForJwt);
  } catch {
    return null;
  }
}
