import db, { schema } from "@/db";
import { oidcClients } from "@/db/schema";
import { SessionsService } from "@/services/SessionsService";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function oidcAuthorization(
  request: Record<string, string | undefined>,
  tenant?: typeof schema.tenants.$inferSelect,
  httpRequest?: NextRequest,
) {
  const preflightResult = await preflightCheck(request, tenant);
  if (preflightResult[1]) {
    return preflightResult[1] as unknown as Response;
  }

  const client = preflightResult[0] as typeof oidcClients.$inferSelect;

  if (!request.scope || !request.scope.match(/\bopenid\b/)) {
    return returnToClient(request.response_mode, request.redirect_uri, {
      error: "invalid_scope",
      error_description: "The openid scope is required",
      state: request.state,
    });

    // TODO (decide): maybe we should treat this as an OAuth2 request instead of
    // OIDC?
  }

  let max_age = client.defaultMaxAge;
  if (request.max_age !== undefined) {
    max_age = parseInt(request.max_age);
    if (isNaN(max_age) || max_age <= 0) {
      return returnToClient(request.response_mode, request.redirect_uri, {
        error: "invalid_request",
        error_description: "The max_age parameter must be a positive integer",
        state: request.state,
      });
    }
  }

  if (max_age === 0) {
    // max_age=0 is equivalent to prompt=login
    request.prompt = "login";
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth")?.value || "";

  switch (request.prompt) {
    case "none":
      // The OP expects the user to be already authenticated and consented.
      // If this is not the case, the request is rejected with interaction_required.
      const sessionsService = new SessionsService(sessionCookie);
      await sessionsService.cleanup();

      const allSessions = await sessionsService.activeSessions();
      if (allSessions.length === 0) {
        return returnToClient(request.response_mode, request.redirect_uri, {
          error: "login_required",
          error_description: "The user must be authenticated",
          state: request.state,
        });
      } else if (allSessions.length === 1) {
        const session = allSessions[0];
        if (session.consent) {
          // The user has already consented to the client
          return redirect(`/oidc/continue`);
        } else {
          // The user has not yet consented to the client
          return returnToClient(request.response_mode, request.redirect_uri, {
            error: "consent_required",
            error_description: "The user must consent to the client",
            state: request.state,
          });
        }
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
        // TODO
      }
    case "login":
    // We are requested to re-authenticate the user. This could be used to
    // protect specific high-value operations.
    case "consent":
    // We are requested to re-confirm the user's consent, even if they have
    // already consented to the client.
    case "select_account":
    // We are requested to prompt the user to select an account. This could be
    // used to switch between multiple accounts.
    default:
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

      const sessions = new SessionsService(sessionCookie);
      const activeSessions = await sessions.activeSessions();
      if (activeSessions.length === 0) {
        // No active sessions, show redirect to login screen
        request.tenant_id = tenant?.id;

        const headers = new Headers();
        headers.set(
          "Set-Cookie",
          `oidc_authorization_request=${JSON.stringify(request)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
        );

        return NextResponse.redirect(
          new URL(
            `/signin?continue=${encodeURIComponent("/oidc/consent")}`,
            `${httpRequest?.headers.get("x-forwarded-proto")}://${httpRequest?.headers.get("host")}`,
          ),
          {
            status: 303,
            headers,
          },
        );
      } else if (activeSessions.length === 1) {
        // Only one active session, show consent screen
        const session = activeSessions[0];
        // TODO: Check if the user has already consented to the client
        if (false) {
          // User has already consented, show confirmation screen
          request.tenant_id = tenant?.id;
          await cookieStore.set(
            "oidc_authorization_request",
            JSON.stringify(request),
            {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
            },
          );

          return redirect(`/oidc/continue`);
        } else {
          // User has not yet consented, show consent screen
          request.tenant_id = tenant?.id;
          const headers = new Headers();
          headers.set(
            "Set-Cookie",
            `oidc_authorization_request=${JSON.stringify(request)}; HttpOnly; Secure; SameSite=Lax; Path=/`,
          );

          return NextResponse.redirect(
            new URL(
              `/oidc/consent`,
              `${httpRequest?.headers.get("x-forwarded-proto")}://${httpRequest?.headers.get("host")}`,
            ),
            {
              status: 303,
              headers,
            },
          );
        }
      } else {
        // Multiple active sessions, show account picker
        request.tenant_id = tenant?.id;
        await cookieStore.set(
          "oidc_authorization_request",
          JSON.stringify(request),
          {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
          },
        );

        return redirect(
          `/switch?continue=${encodeURIComponent("/oidc/consent")}`,
        );
      }
  }
}

type ErrorCode =
  | "invalid_request"
  | "unauthorized_client"
  | "access_denied"
  | "unsupported_response_type"
  | "invalid_scope"
  | "server_error"
  | "temporarily_unavailable"
  | "interaction_required"
  | "login_required"
  | "account_selection_required"
  | "consent_required"
  | "invalid_request_uri";

function returnToClient(
  responseMode: string | undefined,
  redirectUri: string | undefined,
  data: Record<string, string | undefined>,
) {
  if (responseMode == "query") {
    const url = new URL(redirectUri!);

    // Add each key-value pair from the data object to the URL's search parameters
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.append(key, value);
    });

    // Redirect the user to the URL
    return Response.redirect(url.toString(), 303);
  } else if (responseMode == "fragment") {
    const url = new URL(redirectUri!);

    // Add each key-value pair from the data object to the URL's hash
    Object.entries(data).forEach(([key, value]) => {
      url.hash += `${key}=${value}&`;
    });

    // Redirect the user to the URL
    return Response.redirect(url.toString(), 303);
  } else if (responseMode == "form_post") {
    return buildFormPostResponse(redirectUri!, data);
  } else {
    return fatalError("bad_response_mode");
  }
}

function fatalError(error: string) {
  return [null, redirect(`/oidc/fatal?error=${error}`)];
}

// This function performs a number of checks on the Authorization request, for
// errors that are fatal enough that we cannot even report it back to the
// client. By the end of this function, the request parameters should be fully
// resolved and ready for further validations.
async function preflightCheck(
  request: Record<string, string | undefined>,
  tenant?: typeof schema.tenants.$inferSelect,
) {
  // client_id and response_type must always be present
  if (!request.client_id) {
    return fatalError("missing_client_id");
  }

  if (!request.response_type) {
    return fatalError("missing_response_type");
  }

  // We now need to load the client from the database, as the
  // request_object_signing_alg parameter may be required

  const client = await db.query.oidcClients.findFirst({
    where: and(
      eq(oidcClients.id, request.client_id),
      tenant
        ? eq(oidcClients.tenantId, tenant.id)
        : isNull(oidcClients.tenantId),
    ),
  });
  if (!client) {
    return fatalError("invalid_client_id");
  }

  // redirect_uri is allowed to be missing and resolved through request object or URI

  if (request.request && request.request_uri) {
    // Cannot have both request object and request_uri
    return fatalError("request_and_request_uri");
  }

  if (request.request_uri) {
    // TODO: fetch request_uri, place it in request.request
    return fatalError("request_uri_not_supported");
  }

  if (request.request) {
    // TODO:
    //   1. parse request parameter
    //   2. check that client_id and response_type match with the request
    //   3. merge request object parameters with the current request, object
    //      parameters take precedence
    return fatalError("request_not_supported");
  }

  // By this point all parameters have been loaded. redirect_uri is now required
  if (!request.redirect_uri) {
    return fatalError("missing_redirect_uri");
  }

  if (!client.redirectUris.includes(request.redirect_uri)) {
    return fatalError("invalid_redirect_uri");
  }

  // By this point we may be able to send errors back to the client instead of
  // showing a fatal error page. We just need to determine the response_mode,
  // both for successful and failed requests. This may in turn cause a fatal
  // error.
  const response_mode = determineResponseMode(request);
  if (!response_mode) {
    return fatalError("bad_response_mode");
  }

  request.response_mode = response_mode;
  return [client, null];
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
