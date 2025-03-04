import { RESPONSE_TYPES_SUPPORTED } from "@/app/oidc/configuration";
import { schema } from "@/db";
import OidcAuthorizationCodes from "@/db/oidc_authorization_codes";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { Session } from "@/db/sessions";
import { Tenant } from "@/db/tenants";
import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { humanIdToUuid } from "@/utils";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HttpRequest } from "../http/request";
import { buildSubClaim, decodeIdToken } from "./idToken";

const claimRequestSchema = z.record(
  z.string(),
  z.nullable(
    z.object({
      essential: z.boolean().optional(),
      value: z.string().optional(),
      values: z.array(z.string()).optional(),
    }),
  ),
);

const claimsSchema = z.object({
  userinfo: claimRequestSchema.optional(),
  id_token: claimRequestSchema.optional(),
});

export type Claims = z.infer<typeof claimsSchema>;

export type ResponseType = (typeof RESPONSE_TYPES_SUPPORTED)[number];
export type ResponseMode = "query" | "fragment" | "form_post";

export type AuthorizationRequest = {
  tenantId?: string;

  client_id: string;
  response_type: ResponseType;
  response_mode: ResponseMode;
  redirect_uri: string;
  scopes: string[];
  claims: Claims;
  state?: string;
  nonce?: string;
  prompt?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

export async function oidcAuthorization(request: HttpRequest, tenant?: Tenant) {
  const rawParams = await request.params;

  const preflightResult = await preflightCheck(rawParams, tenant);
  if (preflightResult instanceof Response) {
    return preflightResult as unknown as Response;
  }

  const client = preflightResult.client;
  const params = preflightResult.params;
  params.tenantId = tenant?.id;

  if (!params.scopes.includes("openid")) {
    return returnToClient(params, {
      error: "invalid_scope",
      error_description: "The openid scope is required",
    });

    // TODO (decide): maybe we should treat this as an OAuth2 request instead of
    // OIDC?
  }

  if (rawParams.claims) {
    try {
      params.claims = claimsSchema.parse(JSON.parse(rawParams.claims));
    } catch {
      return returnToClient(params, {
        error: "invalid_request",
        error_description: "The claims parameter is invalid",
      });
    }
  } else {
    params.claims = {};
  }

  normalizeClaims(params);

  params.max_age = client.defaultMaxAge || undefined;
  if (rawParams.max_age !== undefined) {
    params.max_age = parseInt(rawParams.max_age);
    if (isNaN(params.max_age) || params.max_age <= 0) {
      return returnToClient(params, {
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
          "Set-Cookie": `oidc_authorization_request=${JSON.stringify(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    case "consent":
    // We are requested to re-confirm the user's consent, even if they have
    // already consented to the client.
    case "login":
      // We are requested to re-authenticate the user. This could be used to
      // protect specific high-value operations.
      params.max_age = 0;
    default:
      return authorizationStandard(request, params, client);
  }
}

function returnToClient(
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
      return Response.redirect(url.toString(), 303);
    }
    case "fragment": {
      const url = new URL(request.redirect_uri);

      // Add each key-value pair from the data object to the URL's hash
      Object.entries(data).forEach(([key, value]) => {
        url.hash += `${key}=${value}&`;
      });

      // Redirect the user to the URL
      return Response.redirect(url.toString(), 303);
    }
    case "form_post":
      return buildFormPostResponse(request.redirect_uri, data);
  }
}

function fatalError(error: string) {
  return redirect(`/oidc/fatal?error=${error}`);
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
  params: Record<string, string | undefined>,
  tenant?: typeof schema.tenants.$inferSelect,
): Promise<PreflightResult | Response> {
  // client_id and response_type must always be present
  if (!params.client_id) {
    return fatalError("missing_client_id");
  }

  if (!params.response_type) {
    return fatalError("missing_response_type");
  }

  if (
    !RESPONSE_TYPES_SUPPORTED.includes(params.response_type as ResponseType)
  ) {
    return fatalError("unsupported_response_type");
  }

  // We now need to load the client from the database, as the
  // request_object_signing_alg parameter may be required

  const clientId = humanIdToUuid(params.client_id, "oidc");
  if (!clientId) {
    return fatalError("invalid_client_id");
  }

  const client = await OidcClients.findWithTenant(clientId, tenant?.id);
  if (!client) {
    return fatalError("invalid_client_id");
  }

  // redirect_uri is allowed to be missing and resolved through request object or URI

  if (params.request && params.request_uri) {
    // Cannot have both request object and request_uri
    return fatalError("request_and_request_uri");
  }

  if (params.request_uri) {
    // TODO: fetch request_uri, place it in request.request
    return fatalError("request_uri_not_supported");
  }

  if (params.request) {
    // TODO:
    //   1. parse request parameter
    //   2. check that client_id and response_type match with the request
    //   3. merge request object parameters with the current request, object
    //      parameters take precedence
    return fatalError("request_not_supported");
  }

  // By this point all parameters have been loaded. redirect_uri is now required
  if (!params.redirect_uri) {
    return fatalError("missing_redirect_uri");
  }

  if (!client.redirectUris.includes(params.redirect_uri)) {
    return fatalError("invalid_redirect_uri");
  }

  // By this point we may be able to send errors back to the client instead of
  // showing a fatal error page. We just need to determine the response_mode,
  // both for successful and failed requests. This may in turn cause a fatal
  // error.
  const response_mode = determineResponseMode(params);
  if (!response_mode) {
    return fatalError("bad_response_mode");
  }

  params.response_mode = response_mode;
  return {
    client,
    params: {
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
  };
}

function determineResponseMode(request: Record<string, string | undefined>) {
  if (
    ["query", "fragment", "form_post"].includes(request.response_mode || "")
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
      return "fragment";
    default:
      return undefined;
  }
}

function buildFormPostResponse(
  redirectUri: string,
  data: Record<string, string | undefined>,
) {
  const params = Object.entries(data).filter(
    ([_, value]) => value !== undefined,
  );

  // We have to render a form that will automatically submit itself to the
  // redirect_uri with the data as form parameters.
  const form = `
    <html>
      <head>
        <title>Redirecting...</title>
      </head>
      <body onload="document.forms[0].submit()">
        <form method="post" action="${redirectUri}">
          ${params.map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join("")}
          <noscript>
            <input type="submit" value="Continue">
          </noscript>
        </form>
      </body>
    </html>
  `;
  return new Response(form, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

function normalizeClaims(params: AuthorizationRequest) {
  if (params.scopes.includes("profile")) {
    params.claims = {
      ...params.claims,

      userinfo: {
        name: null,
        family_name: null,
        given_name: null,
        middle_name: null,
        nickname: null,
        preferred_username: null,
        profile: null,
        picture: null,
        website: null,
        gender: null,
        birthdate: null,
        zoneinfo: null,
        locale: null,
        updated_at: null,

        ...params.claims?.userinfo,
      },
    };
  }

  if (params.scopes.includes("email")) {
    params.claims = {
      ...params.claims,

      userinfo: {
        email: null,
        email_verified: null,

        ...params.claims?.userinfo,
      },
    };
  }

  if (params.scopes.includes("phone")) {
    params.claims = {
      ...params.claims,

      userinfo: {
        phone_number: null,
        phone_number_verified: null,

        ...params.claims?.userinfo,
      },
    };
  }

  if (params.scopes.includes("address")) {
    params.claims = {
      ...params.claims,

      userinfo: {
        address: null,

        ...params.claims?.userinfo,
      },
    };
  }

  params.scopes = params.scopes.filter(
    (scope) => !["profile", "email", "phone", "address"].includes(scope),
  );
}

async function authorizationNone(
  params: AuthorizationRequest,
  client: OidcClient,
) {
  // The RP expects the user to be already authenticated and consented.
  // If this is not the case, the request is rejected.
  const sessionsService = new SessionsService(await getSessionCookie());
  const allSessions = await sessionsService.activeSessions();

  if (allSessions.length === 0) {
    return returnToClient(params, {
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
      session = allSessions.find((sess) =>
        matchesIdTokenHint(sess.userId, params.id_token_hint!, client),
      );
    } else {
      const matching = await Promise.all(
        allSessions.filter(
          async (sess) =>
            await verifyConsent(
              sess.userId,
              client,
              params.scopes,
              params.claims,
            ),
        ),
      );

      if (matching.length == 1) {
        session = matching[0];
      }
    }

    if (!session) {
      // No, or multiple sessions match the criteria
      return returnToClient(params, {
        error: "interaction_required",
        error_description: "The user must interact with the OP",
      });
    } else if (
      params.max_age &&
      Date.now() - session.lastAuthenticatedAt.getTime() > params.max_age * 1000
    ) {
      // The session is too old
      return returnToClient(params, {
        error: "login_required",
        error_description: "The user must re-authenticate",
      });
    } else if (
      !(await verifyConsent(
        session.userId,
        client,
        params.scopes,
        params.claims,
      ))
    ) {
      // The user has not yet consented to the client
      return returnToClient(params, {
        error: "consent_required",
        error_description: "The user must consent to the client",
      });
    } else {
      const code = await createCode(session, params);

      return returnToClient(params, {
        code: code.id,
      });
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

  const sessions = new SessionsService(await getSessionCookie());
  const activeSessions = await sessions.activeSessions(
    params.max_age !== undefined ? params.max_age * 1000 : undefined,
  );

  const matchingSessions = params.id_token_hint
    ? activeSessions.filter((sess) =>
        matchesIdTokenHint(sess.userId, params.id_token_hint!, client),
      )
    : activeSessions;

  if (matchingSessions.length === 0) {
    // No active sessions, show redirect to login screen
    return new Response(null, {
      status: 303,
      headers: {
        Location: req.buildUrl("/signin", {
          continue: "/oidc/consent?sid=__sid__",
        }),
        "Set-Cookie": `oidc_authorization_request=${JSON.stringify(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
      },
    });
  } else if (matchingSessions.length === 1) {
    // Only one active session, show consent screen if needed
    const session = matchingSessions[0];

    if (
      await verifyConsent(session.userId, client, params.scopes, params.claims)
    ) {
      // User has already consented, show confirmation screen
      return new Response(null, {
        status: 303,
        headers: {
          Location: req.buildUrl("/oidc/continue", { sid: session.id }),
          "Set-Cookie": `oidc_authorization_request=${JSON.stringify(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    } else {
      // User has not yet consented, show consent screen
      return new Response(null, {
        status: 303,
        headers: {
          Location: req.buildUrl("/oidc/consent", { sid: session.id }),
          "Set-Cookie": `oidc_authorization_request=${JSON.stringify(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        },
      });
    }
  } else {
    // Multiple active or matching sessions, show account picker
    return new Response(null, {
      status: 303,
      headers: {
        Location: req.buildUrl("/switch"),
        "Set-Cookie": `oidc_authorization_request=${JSON.stringify(params)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
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

  return claims.sub;
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
  client: OidcClient,
  scopes: string[],
  claims: Claims,
) {
  const consent = await OidcConsents.findOrInitialize(client.id, userId);

  for (const scope of scopes) {
    if (!consent.scopes.includes(scope)) {
      return false;
    }
  }

  const requestedClaims = Object.keys(claims.userinfo || {}).concat(
    Object.keys(claims.id_token || {}),
  );
  for (const claim of requestedClaims) {
    if (!consent.claims.includes(claim)) {
      return false;
    }
  }

  return true;
}

export async function createCode(
  session: Session,
  request: AuthorizationRequest,
) {
  return await OidcAuthorizationCodes.create({
    id:
      "oidc_code_" +
      Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
        "base64url",
      ),
    clientId: humanIdToUuid(request.client_id, "oidc")!,
    userId: session.userId,
    redirectUri: request.redirect_uri,
    scopes: request.scopes,
    claims: request.claims,
    nonce: request.nonce,
    authTime: session.lastAuthenticatedAt,
    codeChallenge: request.code_challenge,
    codeChallengeMethod: request.code_challenge_method,
  });
}
