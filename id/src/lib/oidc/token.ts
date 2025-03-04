import OidcAccessTokens from "@/db/oidc_access_tokens";
import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import OidcClients from "@/db/oidc_clients";
import Users from "@/db/users";
import { uuidToHumanId } from "@/utils";
import { HttpRequest } from "../http/request";
import { composeMiddleware, cors, preventCache } from "../middlewares";
import { createIdToken } from "./idToken";
import { validatePkce } from "./pkce";
import { authenticateClient } from "./tokenAuthentication";
import { requestedUserClaims } from "./userClaims";

// The FAPI 2.0 profile requires that the authorization code is only valid for
// one minute or less.
const AUTHORIZATION_CODE_LIFETIME = 60 * 1000;

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
        { error: "unsupported_grant_type" },
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
  if (!(await authenticateClient(req, client))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
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
    const earlyReturn = validatePkce(
      params.code_verifier,
      code.codeChallengeMethod,
      code.codeChallenge,
    );
    if (earlyReturn) {
      return Response.json({ error: earlyReturn }, { status: 400 });
    }
  }

  // Prevent reusing the same code.
  //
  // TODO: when a code is presented multiple times, the server should revoke
  // "all tokens previously issued based on that authorization code". We could
  // store a "code" field in the access tokens table.
  await OidcAuthorizationCodes.delete(params.code);

  // Reject the request if the code has expired
  if (code.createdAt.getTime() + AUTHORIZATION_CODE_LIFETIME < Date.now()) {
    return Response.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Create and return the access token
  const at = await OidcAccessTokens.create({
    clientId: client.id,
    userId: code.userId,
    scopes: code.scopes,
    claims: code.claims,
    nonce: code.nonce,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });

  const user = (await Users.find(code.userId))!;

  const idToken = await createIdToken(req, client, code.userId, code.authTime, {
    ...requestedUserClaims(code.claims.id_token, user),
    nonce: code.nonce,
  });

  return Response.json({
    access_token: uuidToHumanId(at.id, "oidc_at"),
    token_type: "Bearer",
    expires_in: 3600,
    id_token: idToken,
  });
}
