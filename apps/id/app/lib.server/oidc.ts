import { humanIdToUuid } from "@noo/lib/humanIds";
import { type AuthorizationRequest } from "@noo/oidc-server/types";
import { jwtVerify, SignJWT } from "jose";
import { createCookie } from "react-router";
import OidcClients from "~/db.server/oidc_clients";
import { getSigningKey, getVerifyingKeyForJwt } from "~/lib.server/jwks";

export const oidcAuthorizationCookie = createCookie("_noo_oidc_auth_request", {
  secure: true,
  httpOnly: true,
  sameSite: "lax",
});

export async function getOidcAuthorizationRequest(request: Request) {
  const oidcAuthRequest = await oidcAuthorizationCookie.parse(
    request.headers.get("cookie"),
  );
  if (!oidcAuthRequest) {
    return;
  }

  // Verify the signature
  const result = await decode(oidcAuthRequest);

  return result?.payload as AuthorizationRequest | undefined;
}

export async function setOidcAuthorizationCookie(params: AuthorizationRequest) {
  const signedParams = await signParams(params);
  return await oidcAuthorizationCookie.serialize(signedParams);
}

export async function getOidcAuthorizationClient(request: Request) {
  const oidcAuthRequest = await getOidcAuthorizationRequest(request);
  if (!oidcAuthRequest) {
    return undefined;
  }

  const clientId = oidcAuthRequest.client_id;
  if (!clientId) {
    return undefined;
  }

  return await OidcClients.find(humanIdToUuid(clientId, "oidc")!);
}

async function decode(token: string) {
  try {
    return await jwtVerify(token, getVerifyingKeyForJwt);
  } catch {
    return null;
  }
}

async function signParams(params: AuthorizationRequest) {
  const { key, kid } = (await getSigningKey("EdDSA"))!;
  return await new SignJWT(params)
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}
