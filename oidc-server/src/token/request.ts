// The FAPI 2.0 profile requires that the authorization code is only valid for

import configuration from "../configuration";
import { createIdToken } from "../idToken";
import { validatePkce } from "../pkce";
import { requestParams } from "../utils";
import { authenticateClient } from "./tokenAuthentication";

// one minute or less.
const AUTHORIZATION_CODE_LIFETIME = 60 * 1000;

export async function handleTokenRequest(request: Request) {
  const params = await requestParams(request);
  if (!params.grant_type) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  if (params.grant_type === "authorization_code") {
    return await authorizationCodeFlow(request, params);
  }

  return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
}

async function authorizationCodeFlow(
  req: Request,
  params: Record<string, string | undefined>,
) {
  if (!params.code) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const lookup = await configuration.getCode(params.code);
  if (!lookup) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  const { code, client } = lookup;

  // Authenticate the client following the agreed client authentication method
  if (!(await authenticateClient(req, client))) {
    return Response.json({ error: "invalid_client" }, { status: 401 });
  }

  if (params.redirect_uri !== code.redirectUri) {
    // The only exception to the rule is that the redirect_uri may be omitted if
    // the client only uses a single redirect_uri.
    if (client.redirectUris.length != 1 || params.redirect_uri !== undefined) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
  }

  if (code.codeChallenge && code.codeChallengeMethod) {
    // We've been asked to verify the PKCE challenge
    const pkce = validatePkce(
      params.code_verifier,
      code.codeChallengeMethod,
      code.codeChallenge,
    );
    if (pkce.isErr()) {
      return Response.json({ error: pkce.error }, { status: 400 });
    }
  }

  // Prevent reusing the same code.
  //
  // TODO: when a code is presented multiple times, the server should revoke
  // "all tokens previously issued based on that authorization code". We could
  // store a "code" field in the access tokens table.
  await configuration.revokeCode(params.code);

  // Reject the request if the code has expired
  if (code.createdAt!.getTime() + AUTHORIZATION_CODE_LIFETIME < Date.now()) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Create and return the access token
  const at = await configuration.createAccessToken({
    clientId: client.clientId,
    userId: code.userId,
    scopes: code.scopes,
    claims: code.claims,
    nonce: code.nonce ?? undefined,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  if (code.scopes.includes("openid")) {
    const claims = await configuration.getClaims(
      code.userId,
      Object.keys(code.claims.id_token ?? []),
    );

    const idToken = await createIdToken(client, code.userId, {
      ...claims,
      nonce: code.nonce,
      auth_time: Math.floor(code.authTime.getTime() / 1000),
    });

    return Response.json({
      access_token: at.id,
      token_type: "Bearer",
      expires_in: 3600,
      id_token: idToken,
    });
  } else {
    // Fallback to OAuth 2.0 behavior
    return Response.json({
      access_token: at.id,
      token_type: "Bearer",
      expires_in: 3600,
    });
  }
}
