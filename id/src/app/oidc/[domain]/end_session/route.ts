import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { findTenantByDomainName } from "@/db/tenants";
import { HttpRequest } from "@/lib/http/request";
import { decodeIdToken } from "@/lib/oidc/idToken";
import { humanIdToUuid, uuidToHumanId } from "@/utils";

export async function POST(
  raw: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const request = new HttpRequest(raw);
  const domain = (await params).domain;
  const result = await prepareEndSession(request, domain);
  if (result instanceof Response) {
    return result;
  }

  return Response.redirect(
    request.buildUrl(`/oidc/${domain}/end_session_confirm`, result),
    303,
  );
}

export async function GET(
  raw: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const request = new HttpRequest(raw);
  const domain = (await params).domain;
  const result = await prepareEndSession(request, domain);
  if (result instanceof Response) {
    return result;
  }

  return Response.redirect(
    request.buildUrl(`/oidc/${domain}/end_session_confirm`, result),
    303,
  );
}

async function prepareEndSession(request: HttpRequest, domain: string) {
  const query = await request.params;

  const tenant = await findTenantByDomainName(domain);
  if (!tenant) {
    return new Response("Not Found", { status: 404 });
  }

  const idTokenHint = query.id_token_hint;
  const humanClientId = query.client_id;

  let client: OidcClient | undefined;
  if (humanClientId) {
    const clientId = humanIdToUuid(humanClientId, "oidc");
    if (!clientId) {
      return new Response("Not Found", { status: 404 });
    }

    client = await OidcClients.findWithTenant(clientId, tenant.id);
  }

  if (!idTokenHint) {
    return new Response("Not Found", { status: 404 });
  }

  let alg = client?.idTokenSignedResponseAlg;
  if (!alg) {
    // Determine the algorithm used in the ID token.
    // While this may seem unsafe, we double-check the algorithm against the client's
    // expected algorithm in the next step.
    const header = JSON.parse(atob(idTokenHint.split(".")[0]));
    alg = header.alg;
  }

  const decoded = (await decodeIdToken(idTokenHint, alg!)) as Record<
    string,
    string
  >;
  console.log("Decoded ID token", decoded);
  if (!decoded) {
    return new Response("Not Found", { status: 404 });
  }

  if (!client) {
    const humanClientId = Array.isArray(decoded.aud)
      ? decoded.aud[0]
      : decoded.aud;
    const clientId = humanIdToUuid(humanClientId!, "oidc")!;
    client = await OidcClients.findWithTenant(clientId, tenant.id);
    if (!client || alg !== client.idTokenSignedResponseAlg) {
      return new Response("Not Found", { status: 404 });
    }
  }

  if (decoded.iss !== `${request.baseUrl}/oidc/${domain}`) {
    return new Response("Not Found", { status: 404 });
  }

  if (humanClientId && decoded.aud !== humanClientId) {
    return new Response("Not Found", { status: 404 });
  }

  const params: Record<string, string> = {
    clientId: uuidToHumanId(client.id, "oidc"),
    sub: decoded.sub!,
  };

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
