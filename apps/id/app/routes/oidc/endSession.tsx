// See: https://openid.net/specs/openid-connect-rpinitiated-1_0.html.
//
// This nightmare of an endpoint is used by OIDC clients to log out users out of
// the OIDC provider, after they have logged out of the client.
//
// The specification allows for a number of parameters to be passed to the
// endpoint, which are all optional (which is a bad idea), but when passed, they
// must be validated.

import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { EXTENDED_SUPPORTED_LANGUAGES } from "@noo/lib/i18n";
import {
  buildSubClaim,
  decodeIdToken,
  getInsecureAudience,
} from "@noo/oidc-server/idToken";
import { requestParams } from "@noo/oidc-server/utils";
import { Button, Noo } from "@noo/ui";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useTranslations } from "use-intl";
import {
  endAllSessions,
  endSession,
  getActiveSessions,
} from "~/auth.server/sessions";
import type { OidcClient } from "~/db.server/oidc_clients";
import OidcClients from "~/db.server/oidc_clients";
import type { Session } from "~/db.server/sessions";
import Tenants, { type Tenant } from "~/db.server/tenants";
import { dbClientToClient } from "~/lib.server/interface";
import { localeContext } from "~/root";
import {
  makeClientOidcClient,
  type ClientOidcClient,
} from "~/types/ClientOidcClient";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const raw = humanIdToUuid(params.tenantId!, "org");
  if (!raw) {
    return new Response("Not Found", { status: 404 });
  }

  const tenant = await Tenants.find(raw);
  if (!tenant) {
    return new Response("Not Found", { status: 404 });
  }

  const reqParams = await requestParams(request);
  return await prepareEndSession(reqParams, context, tenant);
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const raw = humanIdToUuid(params.tenantId!, "org");
  if (!raw) {
    return new Response("Not Found", { status: 404 });
  }

  const tenant = await Tenants.find(raw);
  if (!tenant) {
    return new Response("Not Found", { status: 404 });
  }

  const reqParams = await requestParams(request);
  if (!Object.keys(reqParams).includes("decision")) {
    // This is a POST request made to the end session endpoint.
    return await prepareEndSession(reqParams, context, tenant);
  } else {
    // This is a POST request made as a result of the user clicking on the
    // "yes" or "no" button.
    const client = reqParams.client_id
      ? await OidcClients.find(humanIdToUuid(reqParams.client_id, "oidc")!)
      : undefined;

    if (reqParams.decision === "no") {
      // The user has requested to stay logged in to noo, return to the
      // post_logout_redirect_uri if present, or the home page.
      return finish(client, reqParams.postLogoutRedirectUri, reqParams.state);
    }

    const sessions = await getActiveSessions(request);

    let matchingSession: Session | undefined;
    if (reqParams.sub && client) {
      matchingSession = sessions.find(
        (sess) =>
          buildSubClaim(dbClientToClient(client), sess.userId) == reqParams.sub,
      );

      if (!matchingSession) {
        return redirect("/");
      }
    }

    if (!matchingSession) {
      await endAllSessions(request);
    } else {
      await endSession(request, matchingSession.id);
    }

    return finish(client, reqParams.postLogoutRedirectUri, reqParams.state);
  }
}

function failure() {
  return redirect("/oidc/fatal?error=invalid_request");
}

async function prepareEndSession(
  requestParams: Record<string, string>,
  context: LoaderFunctionArgs["context"],
  tenant: Tenant,
) {
  const idTokenHint = requestParams.id_token_hint;
  const humanClientId = requestParams.client_id;

  let client: OidcClient | undefined;
  if (humanClientId) {
    const clientId = humanIdToUuid(humanClientId, "oidc");
    if (!clientId) {
      return failure();
    }

    client = await OidcClients.findWithTenant(clientId, tenant.id);
    if (!client) {
      return failure();
    }
  }

  const params: {
    sub?: string;
    clientId?: string;
    client?: ClientOidcClient;
    postLogoutRedirectUri?: string;
    state?: string;
    language: string;
  } = {
    language: context.get(localeContext).locale,
  };

  if (idTokenHint) {
    if (!client) {
      // id_token_hint is passed, but no client_id. This is annoying, but
      // allowed. We can't properly verify the id_token_hint, as we don't know
      // the algorithm that the client is bound to use.
      //
      // So, unsafely extract the audience (client_id) from the id_token_hint,
      // load the client, then verify the id_token_hint with the client expected
      // algorithm.

      let clientId = getInsecureAudience(idTokenHint);
      if (!clientId) {
        return failure();
      }

      clientId = humanIdToUuid(clientId, "oidc");
      if (!clientId) {
        return failure();
      }

      client = await OidcClients.findWithTenant(clientId, tenant.id);
      if (!client) {
        return failure();
      }
    }

    // We must now have a client, so we can verify the id_token_hint with its
    // idTokenSignedResponseAlg.
    const decoded = await decodeIdToken(idTokenHint, {
      issuer: `${process.env.OIDC_ISSUER}/${uuidToHumanId(tenant.id, "org")}`,
      allowExpired: true,
      alg: client.idTokenSignedResponseAlg,
    });

    if (decoded.isErr() || !decoded.value.sub) {
      return failure();
    }

    params.sub = decoded.value.sub;
  }

  if (requestParams.ui_locales) {
    // Determine the locales to use for the UI. This is a space-separated list
    // of locales codes.
    const locales = requestParams.ui_locales.split(" ").map((locale) => {
      const [lang, _] = locale.split("-");
      return lang.toLowerCase().trim();
    });

    const firstMatchingLocale = locales.find((locale) => {
      return EXTENDED_SUPPORTED_LANGUAGES.includes(locale);
    });

    if (firstMatchingLocale) {
      params.language = firstMatchingLocale;
    }
  }

  if (client) {
    params.clientId = uuidToHumanId(client.id, "oidc");
    params.client = makeClientOidcClient(client, params.language);
  }

  if (requestParams.post_logout_redirect_uri) {
    params.postLogoutRedirectUri = requestParams.post_logout_redirect_uri;
  }

  if (requestParams.state) {
    params.state = requestParams.state;
  }

  return params;
}

function finish(
  client: OidcClient | undefined,
  postLogoutRedirectUri: string | undefined,
  state: string | undefined,
) {
  if (!isValidRedirectUri(client, postLogoutRedirectUri)) {
    return redirect("/");
  }

  const postRedirect = new URL(postLogoutRedirectUri!);
  if (state) {
    postRedirect.searchParams.set("state", state);
  }

  return redirect(postRedirect.toString());
}

const isValidRedirectUri = (
  client?: OidcClient,
  postLogoutRedirectUri?: string,
) => {
  if (!client || !postLogoutRedirectUri) {
    return false;
  }

  return (
    !client.postLogoutRedirectUris ||
    client.postLogoutRedirectUris.includes(postLogoutRedirectUri)
  );
};

export default function EndSession() {
  // Only one of these will be set, depending on the method used to call the
  // endpoint.
  const params = {
    ...useLoaderData<typeof loader>(),
    ...useActionData<typeof action>(),
  };

  const t = useTranslations("oidc");
  const commonT = useTranslations("common");
  const name = params.client?.clientName;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">{t("end_session.title")}</h1>
      <p>
        {name
          ? t.rich("end_session.description", {
              name,
              strong: (children) => <strong>{children}</strong>,
            })
          : t.rich("end_session.description_no_app", {
              strong: (children) => <strong>{children}</strong>,
            })}
      </p>
      <p>{t.rich("end_session.query", { noo: () => <Noo /> })}</p>
      <Form method="POST">
        <div className="flex gap-4 justify-end">
          <input
            type="hidden"
            name="postLogoutRedirectUri"
            value={params.postLogoutRedirectUri}
          />
          <input type="hidden" name="state" value={params.state} />
          <input type="hidden" name="sub" value={params.sub} />
          <input type="hidden" name="client_id" value={params.clientId} />
          <Button type="submit" name="decision" value="yes">
            {commonT("yes")}
          </Button>
          <Button type="submit" name="decision" value="no" kind="secondary">
            {commonT("no")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
