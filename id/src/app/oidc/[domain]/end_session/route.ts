import { getTenant } from "@/app/oidc/utils";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { Tenant } from "@/db/tenants";
import { HttpRequest } from "@/lib/http/request";
import { decodeIdToken, getIdTokenAlg } from "@/lib/oidc/idToken";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import { notFound } from "next/navigation";

// See: https://openid.net/specs/openid-connect-rpinitiated-1_0.html.
//
// This nightmare of an endpoint is used by OIDC clients to log out users out of
// the OIDC provider, after they have logged out of the client.
//
// The specification allows for a number of parameters to be passed to the
// endpoint, which are all optional (which is a bad idea), but when passed, they
// must be validated.

export async function GET(
  raw: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const tenant = await getTenant(params);
  if (!tenant) {
    return notFound();
  }

  const request = new HttpRequest(raw);
  const result = await prepareEndSession(request, tenant);
  if (result instanceof Response) {
    return result;
  }

  return Response.redirect(
    request.buildUrl(`/oidc/${tenant.domain}/end_session_confirm`, result),
    303,
  );
}

export async function POST(
  raw: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  return GET(raw, { params });
}

function failure(request: HttpRequest) {
  return Response.redirect(
    request.buildUrl("/oidc/fatal", { error: "invalid_request" }),
    303,
  );
}

async function prepareEndSession(request: HttpRequest, tenant: Tenant) {
  const query = await request.params;

  const idTokenHint = query.id_token_hint;
  const humanClientId = query.client_id;

  let client: OidcClient | undefined;
  if (humanClientId) {
    const clientId = humanIdToUuid(humanClientId, "oidc");
    if (!clientId) {
      return failure(request);
    }

    client = await OidcClients.findWithTenant(clientId, tenant.id);
    if (!client) {
      return failure(request);
    }
  }

  let decoded: Record<string, unknown> | undefined;
  let alg: string | undefined;
  if (idTokenHint) {
    alg = client?.idTokenSignedResponseAlg;
    if (!alg) {
      // Determine the algorithm used in the ID token.
      // While this may seem unsafe, we double-check the algorithm against the client's
      // expected algorithm in the next step.
      alg = getIdTokenAlg(idTokenHint);
    }

    decoded = await decodeIdToken(idTokenHint, alg!);
    if (!decoded?.sub || !decoded.iss || !decoded.aud) {
      return failure(request);
    }
  }

  const params: Record<string, string> = {};

  if (!client && decoded) {
    const humanClientId = (
      Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud
    ) as string;
    const clientId = humanIdToUuid(humanClientId, "oidc")!;
    client = await OidcClients.findWithTenant(clientId, tenant.id);
    if (!client || alg !== client.idTokenSignedResponseAlg) {
      return failure(request);
    }
  }

  if (decoded) {
    if (decoded.iss !== `${request.baseUrl}/oidc/${tenant.domain}`) {
      return failure(request);
    }

    if (humanClientId && decoded.aud !== humanClientId) {
      return failure(request);
    }

    params.sub = decoded.sub as string;
  }

  if (client) {
    params.clientId = uuidToHumanId(client.id, "oidc");
  }

  if (query.post_logout_redirect_uri) {
    params.postLogoutRedirectUri = query.post_logout_redirect_uri;
  }

  if (query.state) {
    params.state = query.state;
  }

  if (query.ui_locales) {
    params.uiLocales = query.ui_locales;
  }

  return params;
}
