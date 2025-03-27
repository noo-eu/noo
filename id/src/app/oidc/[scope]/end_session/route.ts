import { getTenant } from "@/app/oidc/utils";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { Tenant } from "@/db/tenants";
import { HttpRequest } from "@/lib/http/request";
import "@/lib/oidc/setup";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import { decodeIdToken, getUnsecureAudience } from "@noo/oidc-server/idToken";
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
  { params }: { params: Promise<{ scope: string }> },
) {
  const scope = (await params).scope;
  const tenant = await getTenant(scope);
  if (!tenant) {
    return notFound();
  }

  const request = new HttpRequest(raw);
  const result = await prepareEndSession(request, tenant);
  if (result instanceof Response) {
    return result;
  }

  return Response.redirect(
    request.buildUrl(`/oidc/${scope}/end_session_confirm`, result),
    303,
  );
}

export async function POST(
  raw: Request,
  { params }: { params: Promise<{ scope: string }> },
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

  const params: Record<string, string> = {};

  if (idTokenHint) {
    if (!client) {
      // id_token_hint is passed, but no client_id. This is annoying, but
      // allowed. We can't properly verify the id_token_hint, as we don't know
      // the algorithm that the client is bound to use.
      //
      // So, unsafely extract the audience (client_id) from the id_token_hint,
      // load the client, then verify the id_token_hint with the client expected
      // algorithm.

      let clientId = getUnsecureAudience(idTokenHint);
      if (!clientId) {
        return failure(request);
      }

      clientId = humanIdToUuid(clientId, "oidc");
      if (!clientId) {
        return failure(request);
      }

      client = await OidcClients.findWithTenant(clientId, tenant.id);
      if (!client) {
        return failure(request);
      }
    }

    // We must now have a client, so we can verify the id_token_hint with its
    // idTokenSignedResponseAlg.
    const decoded = await decodeIdToken(idTokenHint, {
      issuer: `${request.baseUrl}/oidc/${uuidToHumanId(tenant.id, "org")}`,
      allowExpired: true,
      alg: client.idTokenSignedResponseAlg,
    });

    if (decoded.isErr() || !decoded.value.sub) {
      return failure(request);
    }

    params.sub = decoded.value.sub;
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
