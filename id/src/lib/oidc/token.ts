import { HttpRequest } from "../http/request";
import { composeMiddleware, cors, preventCache } from "../middlewares";
import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import OidcClients from "@/db/oidc_clients";
import OidcAccessTokens from "@/db/oidc_access_tokens";
import { authenticateClient } from "./tokenAuthentication";
import { createIdToken } from "./idToken";
import { sha256 } from "@/utils";
import crypto from "crypto";

export const tokenEndpoint = composeMiddleware(
  preventCache,
  cors(["POST"]),
  handle,
);

async function handle(req: HttpRequest) {
  const params = await req.formParams;

  switch (params.grant_type) {
    case "authorization_code":
      return await authorizationCodeFlow(req, params);
    default:
      return Response.json(
        { error: "unsupported_grant_type" + JSON.stringify(params) },
        { status: 400 },
      );
  }
}

async function authorizationCodeFlow(
  req: HttpRequest,
  params: Record<string, string | undefined>,
) {
  if (!params.code) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const code = await OidcAuthorizationCodes.find(params.code);
  if (!code) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Foreign key constraints will make sure that the client exists
  const client = (await OidcClients.find(code.clientId))!;

  // Authenticate the client following the agreed client authentication method
  if (!authenticateClient(req, client)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  if (params.redirect_uri !== code.redirectUri) {
    // The only exception to the rule is that the redirect_uri may be omitted if
    // the client only uses a single redirect_uri.
    if (client.redirectUris.length != 1 || params.redirect_uri !== undefined) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
  }

  // PKCE validation
  if (code.codeChallenge) {
    if (!params.code_verifier) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    let challenge;
    switch (code.codeChallengeMethod) {
      case "plain":
        challenge = params.code_verifier;
        break;
      case "S256":
        challenge = sha256(params.code_verifier).digest("base64url");
        break;
      default:
        return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(challenge),
        Buffer.from(code.codeChallenge),
      )
    ) {
      return Response.json({ error: "invalid_grant" }, { status: 400 });
    }
  }

  // Prevent reusing the same code.
  //
  // TODO: when a code is presented multiple times, the server should revoke
  // "all tokens previously issued based on that authorization code". We could
  // store a "code" field in the access tokens table.
  await OidcAuthorizationCodes.delete(params.code);

  // Create and return the access token
  const at = await OidcAccessTokens.create({
    clientId: client.id,
    userId: code.userId,
    scopes: code.scopes,
    claims: code.claims,
    nonce: code.nonce,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  const idToken = await createIdToken(req, client, code.userId, code.authTime, {
    nonce: code.nonce,
  });

  return Response.json({
    access_token: at.id,
    token_type: "Bearer",
    expires_in: 3600,
    id_token: idToken,
  });
}
