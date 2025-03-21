import { RESPONSE_TYPES_SUPPORTED } from "@/app/oidc/configuration";
import { getKeyByAlg } from "@/app/oidc/jwks";
import { getActiveSessions } from "@/auth/sessions";
import { schema } from "@/db";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { Session } from "@/db/sessions";
import { Tenant } from "@/db/tenants";
import { asyncFilter, asyncFind, humanIdToUuid } from "@/utils";
import { SignJWT } from "jose";
import { err, ok, Result } from "neverthrow";
import { HttpRequest } from "../http/request";
import { buildFormPostResponse } from "./authorization/formPost";
import { buildAuthorizationResponse } from "./authorization/response";
import { buildSubClaim, decodeIdToken } from "./idToken";
import {
  AuthorizationRequest,
  Claims,
  claimsSchema,
  ResponseMode,
  ResponseType,
} from "./types";

export async function oidcAuthorization(request: HttpRequest, tenant?: Tenant) {
  const issuer = `${request.baseUrl}/oidc${tenant ? "/" + tenant.domain : ""}`;
  const rawParams = await request.params;

  const preflightResult = await preflightCheck(issuer, rawParams, tenant);
  if (preflightResult.isErr()) {
    return fatalError(request.baseUrl, preflightResult.error);
  }

  const client = preflightResult.value.client;
  const params = preflightResult.value.params;
  params.tenantId = tenant?.id;

  if (!params.scopes.includes("openid")) {
    // Well, technically this is not an OIDC request, but an OAuth2 request.
    // We will not be issuing an id_token, but we will still issue an access
    // token (with no access to the userinfo endpoint). However, some OIDC
    // specific parameters are not allowed.
    if (
      params.id_token_hint ||
      params.login_hint ||
      params.max_age ||
      params.acr_values ||
      ![undefined, "consent", "select_account"].includes(params.prompt) ||
      !["code", "token"].includes(params.response_type)
    ) {
      return await returnToClient(params, {
        error: "invalid_request",
        error_description: "The request is not an OIDC request",
      });
    }
  }

  if (rawParams.claims) {
    try {
      params.claims = claimsSchema.parse(JSON.parse(rawParams.claims));
    } catch {
      return await returnToClient(params, {
        error: "invalid_request",
        error_description: "The claims parameter is invalid",
      });
    }
  } else {
    params.claims = {};
  }

  scopesToClaims(params);

  params.max_age = client.defaultMaxAge ?? undefined;
  if (rawParams.max_age !== undefined) {
    params.max_age = parseInt(rawParams.max_age);
    if (isNaN(params.max_age) || params.max_age <= 0) {
      return await returnToClient(params, {
        error: "invalid_request",
        error_description: "The max_age parameter must be a positive integer",
      });
    }
  }

  params.id_token_hint = await extractIdTokenSub(
    params.id_token_hint,
    client,
    tenant
      ? `${request.baseUrl}/oidc/${tenant.domain}`
      : `${request.baseUrl}/oidc`,
  );

  switch (params.prompt) {
    case "none":
      return authorizationNone(params, client);
    case "select_account":
      // We are requested to prompt the user to select an account. This could be
      // used to switch between multiple accounts.
      return new Response(null, {
        status: 303,
        headers: {
          Location: request.buildUrl("/switch"),
          "Set-Cookie": `oidc_authorization_request=${await signParams(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    case "consent":
    // We are requested to re-confirm the user's consent, even if they have
    // already consented to the client.
    case "login":
      // We are requested to re-authenticate the user. This could be used to
      // protect specific high-value operations.
      params.max_age = 0;

    // Fall through
    default:
      return authorizationStandard(request, params, client);
  }
}

export function returnToClientUrl(
  request: AuthorizationRequest,
  data: Record<string, string | undefined>,
) {
  data.state = request.state;

  switch (request.response_mode) {
    case "query": {
      const url = new URL(request.redirect_uri);

      // Add each key-value pair from the data object to the URL's search parameters
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) return;
        url.searchParams.append(key, value);
      });

      // Redirect the user to the URL
      return url.toString();
    }
    case "fragment": {
      const url = new URL(request.redirect_uri);

      // Add each key-value pair from the data object to the URL's hash
      Object.entries(data).forEach(([key, value]) => {
        url.hash += `${key}=${value}&`;
      });

      // Redirect the user to the URL
      return url.toString();
    }
    case "form_post":
      return null;
  }
}

export async function returnToClient(
  request: AuthorizationRequest,
  data: Record<string, string | undefined>,
) {
  const url = returnToClientUrl(request, data);
  if (url) {
    return Response.redirect(url, 303);
  } else if (request.response_mode === "form_post") {
    return await buildFormPostResponse(request.redirect_uri, data);
  } else {
    throw new Error("Unsupported response mode");
  }
}

function fatalError(baseUrl: string, error: string) {
  return Response.redirect(`${baseUrl}/oidc/fatal?error=${error}`, 303);
}

type PreflightResult = {
  client: OidcClient;
  params: AuthorizationRequest;
};

// This function performs a number of checks on the Authorization request, for
// errors that are fatal enough that we cannot even report it back to the
// client. By the end of this function, the request parameters should be fully
// resolved and ready for further validations.
async function preflightCheck(
  issuer: string,
  params: Record<string, string | undefined>,
  tenant?: typeof schema.tenants.$inferSelect,
): Promise<Result<PreflightResult, string>> {
  // client_id and response_type must always be present
  if (!params.client_id) {
    return err("missing_client_id");
  }

  if (!params.response_type) {
    return err("missing_response_type");
  }

  if (
    !RESPONSE_TYPES_SUPPORTED.includes(params.response_type as ResponseType)
  ) {
    return err("unsupported_response_type");
  }

  if (params.response_type.includes("id_token") && !params.nonce) {
    return err("implicit_missing_nonce");
  }

  // We now need to load the client from the database, as the
  // request_object_signing_alg parameter may be required

  const clientId = humanIdToUuid(params.client_id, "oidc");
  if (!clientId) {
    return err("invalid_client_id");
  }

  const client = await OidcClients.findWithTenant(clientId, tenant?.id);
  if (!client) {
    return err("invalid_client_id");
  }

  // redirect_uri is allowed to be missing and resolved through request object or URI

  if (params.request && params.request_uri) {
    // Cannot have both request object and request_uri
    return err("request_and_request_uri");
  }

  if (params.request_uri) {
    // TODO: fetch request_uri, place it in request.request
    return err("request_uri_not_supported");
  }

  if (params.request) {
    // TODO:
    //   1. parse request parameter
    //   2. check that client_id and response_type match with the request
    //   3. merge request object parameters with the current request, object
    //      parameters take precedence
    return err("request_not_supported");
  }

  // By this point all parameters have been loaded. redirect_uri is now required
  if (!params.redirect_uri) {
    return err("missing_redirect_uri");
  }

  if (!client.redirectUris.includes(params.redirect_uri)) {
    return err("invalid_redirect_uri");
  }

  // By this point we may be able to send errors back to the client instead of
  // showing a fatal error page. We just need to determine the response_mode,
  // both for successful and failed requests. This may in turn cause a fatal
  // error.
  const response_mode = determineResponseMode(params);
  if (!response_mode) {
    return err("bad_response_mode");
  }

  params.response_mode = response_mode;
  return ok({
    client,
    params: {
      issuer,
      client_id: params.client_id,
      response_type:
        params.response_type as (typeof RESPONSE_TYPES_SUPPORTED)[number],
      redirect_uri: params.redirect_uri,
      response_mode: response_mode as ResponseMode,
      scopes: params.scope?.split(" ") || [],
      claims: {},
      state: params.state,
      nonce: params.nonce,
      prompt: params.prompt,
      ui_locales: params.ui_locales,
      login_hint: params.login_hint,
      acr_values: params.acr_values,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
    },
  });
}

function determineResponseMode(request: Record<string, string | undefined>) {
  if (
    ["query", "fragment", "form_post"].includes(request.response_mode ?? "")
  ) {
    return request.response_mode;
  } else if (request.response_mode) {
    return undefined;
  }

  // Fall back to the default mode for the response_type
  switch (request.response_type) {
    case "code":
      return "query";
    case "id_token":
    case "id_token token":
    case "code id_token":
    case "code token":
    case "code id_token token":
    case "token":
      return "fragment";
    default:
      return undefined;
  }
}

const SCOPES_TO_CLAIMS: Record<string, string[]> = {
  profile: [
    "name",
    "family_name",
    "given_name",
    "middle_name",
    "nickname",
    "preferred_username",
    "profile",
    "picture",
    "website",
    "gender",
    "birthdate",
    "zoneinfo",
    "locale",
    "updated_at",
  ],
  email: ["email", "email_verified"],
  phone: ["phone_number", "phone_number_verified"],
  address: ["address"],
};

function scopesToClaims(params: AuthorizationRequest) {
  for (const scope of params.scopes) {
    if (!SCOPES_TO_CLAIMS[scope]) {
      continue;
    }

    const newClaims = SCOPES_TO_CLAIMS[scope].map((claim) => [claim, null]);

    params.claims = {
      ...params.claims,

      userinfo: {
        ...Object.fromEntries(newClaims),
        ...params.claims?.userinfo,
      },
    };
  }
}

async function authorizationNone(
  params: AuthorizationRequest,
  client: OidcClient,
) {
  // The RP expects the user to be already authenticated and consented.
  // If this is not the case, the request is rejected.
  const allSessions = await getActiveSessions();

  if (allSessions.length === 0) {
    return await returnToClient(params, {
      error: "login_required",
      error_description: "The user must be authenticated",
    });
  } else {
    // The spec leaves open a small undefined behaviour. Multiple sessions
    // could be active at the same time at the OP (us). The only way to
    // distinguish between them is by the id_token_hint parameter, which is
    // RECOMMENDED, but not REQUIRED.
    //
    // Our strategy will be as follows:
    //   1. If we have an id_token_hint, we'll use it to find the session.
    //   2. If we don't have an id_token_hint, we'll check which of the
    //      active sessions have consented to the client.
    //   3. If we have multiple sessions that match the criteria, we'll
    //      return an interaction_required error.

    let session: Session | undefined;
    if (params.id_token_hint) {
      session = await asyncFind(
        allSessions,
        async (sess) =>
          await matchesIdTokenHint(sess.userId, params.id_token_hint!, client),
      );
    } else {
      const matching = await asyncFilter(
        allSessions,
        async (sess) =>
          await verifyConsent(
            sess.userId,
            client.id,
            params.scopes,
            params.claims,
            true,
          ),
      );

      if (matching.length == 1) {
        session = matching[0];
      }
    }

    if (!session) {
      // No, or multiple sessions match the criteria
      return await returnToClient(params, {
        error: "interaction_required",
        error_description: "The user must interact with the OP",
      });
    } else if (
      params.max_age &&
      Date.now() - session.lastAuthenticatedAt.getTime() > params.max_age * 1000
    ) {
      // The session is too old
      return await returnToClient(params, {
        error: "login_required",
        error_description: "The user must re-authenticate",
      });
    } else if (
      !(await verifyConsent(
        session.userId,
        client.id,
        params.scopes,
        params.claims,
        true,
      ))
    ) {
      // The user has not yet consented to the client
      return await returnToClient(params, {
        error: "consent_required",
        error_description: "The user must consent to the client",
      });
    } else {
      const responseParams = await buildAuthorizationResponse(
        client,
        params,
        session.user,
      );

      return await returnToClient(params, responseParams);
    }
  }
}

async function authorizationStandard(
  req: HttpRequest,
  params: AuthorizationRequest,
  client: OidcClient,
) {
  // No specific requirement.
  //
  // Our strategy will be as follows:
  //   - if there's only one active session:
  //     - if the user has not yet consented to the client: show the consent
  //       screen, with the option to switch accounts
  //     - if the user has already consented to the client: show a
  //       confirmation screen, to let the user know what's happening, to
  //       give them a chance to cancel or to switch accounts.
  //   - if there are multiple active sessions: show the account picker.
  //   - if there are no active sessions, show the login screen.

  const activeSessions = await getActiveSessions(
    params.max_age !== undefined ? params.max_age * 1000 : undefined,
  );

  const matchingSessions = params.id_token_hint
    ? await asyncFilter(activeSessions, async (sess) =>
        matchesIdTokenHint(sess.userId, params.id_token_hint!, client),
      )
    : activeSessions;

  const signedParams = await signParams(params);

  if (matchingSessions.length === 0) {
    // No active sessions, show redirect to login screen
    return new Response(null, {
      status: 303,
      headers: {
        Location: req.buildUrl("/signin"),
        "Set-Cookie": `oidc_authorization_request=${signedParams}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      },
    });
  } else if (matchingSessions.length === 1) {
    // Only one active session, show consent screen if needed
    const session = matchingSessions[0];

    if (
      await verifyConsent(
        session.userId,
        client.id,
        params.scopes,
        params.claims,
      )
    ) {
      // User has already consented, show confirmation screen
      return new Response(null, {
        status: 303,
        headers: {
          Location: req.buildUrl("/oidc/continue", { sid: session.id }),
          "Set-Cookie": `oidc_authorization_request=${signedParams}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    } else {
      // User has not yet consented, show consent screen
      return new Response(null, {
        status: 303,
        headers: {
          Location: req.buildUrl("/oidc/consent", { sid: session.id }),
          "Set-Cookie": `oidc_authorization_request=${signedParams}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    }
  } else {
    // Multiple active or matching sessions, show account picker
    return new Response(null, {
      status: 303,
      headers: {
        Location: req.buildUrl("/switch"),
        "Set-Cookie": `oidc_authorization_request=${signedParams}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      },
    });
  }
}

async function extractIdTokenSub(
  idTokenHint: string | undefined,
  client: OidcClient,
  expectedIss: string,
) {
  if (!idTokenHint) {
    return undefined;
  }

  const claims = await decodeIdToken(
    idTokenHint,
    client.idTokenSignedResponseAlg,
  );
  if (!claims) {
    return undefined;
  }

  if (claims.iss != expectedIss) {
    return undefined;
  }

  return claims.sub as string;
}

async function matchesIdTokenHint(
  userId: string,
  idTokenHintSub: string,
  client: OidcClient,
) {
  return buildSubClaim(client, userId) != idTokenHintSub;
}

async function verifyConsent(
  userId: string,
  clientId: string,
  scopes: string[],
  claims: Claims,
  strict: boolean = false, // Whether openid must also be consented
) {
  const consent = await OidcConsents.findOrInitialize(clientId, userId);

  for (const scope of scopes) {
    // Check that the user has consented to each scope (except openid, which is
    // implicitly granted)
    if (!consent.scopes.includes(scope) && (scope !== "openid" || strict)) {
      return false;
    }
  }

  const requestedClaims = Object.keys({
    ...claims.userinfo,
    ...claims.id_token,
  });

  for (const claim of requestedClaims) {
    if (!consent.claims.includes(claim)) {
      return false;
    }
  }

  return true;
}

async function signParams(params: AuthorizationRequest) {
  const { key, kid } = (await getKeyByAlg("EdDSA"))!;
  return await new SignJWT(params)
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}
