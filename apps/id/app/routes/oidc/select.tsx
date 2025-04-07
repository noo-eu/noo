import { humanIdToUuid } from "@noo/lib/humanIds";
import type { AuthorizationRequest } from "@noo/oidc-server/types";
import {
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  getActiveSessions,
  getAuthenticatedSession,
  getAuthenticatedUser,
} from "~/auth.server/sessions";
import OidcClients, { type OidcClient } from "~/db.server/oidc_clients";
import type { UserWithTenant } from "~/db.server/users.server";
import { needsConsent, storeConsent } from "~/lib.server/consent.server";
import { dbClientToClient, dbSessionToSession } from "~/lib.server/interface";
import {
  getOidcAuthorizationClient,
  getOidcAuthorizationRequest,
  oidcAuthorizationCookie,
} from "~/lib.server/oidc";
import {
  buildAuthorizationResponse,
  returnToClient,
} from "~/lib.server/oidcServer";
import { localeContext } from "~/root";
import { AccountSwitcher } from "~/screens/account_switcher/AccountSwitcher";
import { makeClientOidcClient } from "~/types/ClientOidcClient";
import { makeClientSession } from "~/types/ClientSession";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const client = await getOidcAuthorizationClient(request);
  if (!client) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const sessions = await getActiveSessions(request);
  if (sessions.length === 0) {
    return redirect("/");
  }

  const locale = context.get(localeContext).locale;

  return {
    client: makeClientOidcClient(client, locale),
    sessions: sessions.map(makeClientSession),
  };
}

export default function Page() {
  const { client, sessions } = useLoaderData<typeof loader>();

  return <AccountSwitcher client={client} sessions={sessions} />;
}

export async function action({ request }: ActionFunctionArgs) {
  const oidcAuthRequest = await getOidcAuthorizationRequest(request);
  if (!oidcAuthRequest) {
    // We must be in the context of an OIDC authorization
    return redirect("/");
  }

  const client = await OidcClients.find(
    humanIdToUuid(oidcAuthRequest.client_id, "oidc")!,
  );
  if (!client) {
    return redirect("/");
  }

  const form = await request.formData();
  const uid = form.get("uid")?.toString();
  const user = await getAuthenticatedUser(request, uid);
  if (!user) {
    return redirect("/oidc/switch");
  }

  // Check that the user is allowed to use this OIDC client
  if (client.tenantId && client.tenantId !== user.tenantId) {
    return redirect("/oidc/switch");
  }

  // Check the consent status
  const claimKeys = Object.keys({
    ...oidcAuthRequest.claims.id_token,
    ...oidcAuthRequest.claims.userinfo,
  });

  if (await needsConsent(client, user, oidcAuthRequest.scopes, claimKeys)) {
    redirect(`/oidc/consent?uid=${uid}`);
  }

  // Consent is not needed, fast forward to the authorization response
  await finishOidcAuthorization(request, client, user, oidcAuthRequest);
}

async function finishOidcAuthorization(
  request: Request,
  client: OidcClient,
  user: UserWithTenant,
  oidcAuthRequest: AuthorizationRequest,
) {
  await storeConsent(
    user.id,
    client.id,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

  const session = (await getAuthenticatedSession(request, user.id))!;

  const responseParams = await buildAuthorizationResponse(
    request,
    oidcAuthRequest,
    dbClientToClient(client),
    dbSessionToSession(session),
  );

  const result = await returnToClient(oidcAuthRequest, responseParams);

  const responseArgs = {
    headers: {
      "Set-Cookie": await oidcAuthorizationCookie.serialize("", { maxAge: 0 }),
    },
  };

  if (result.nextStep === "FORM_POST") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(responseParams));

    return redirect(
      `/oidc/form-post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
      responseArgs,
    );
  } else {
    return redirect(result.url!, responseArgs);
  }
}
