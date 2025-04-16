import { humanIdToUuid } from "@noo/lib/humanIds";
import type { AuthorizationRequest } from "@noo/oidc-server/types";
import { Button } from "@noo/ui";
import {
  Form,
  redirect,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { userContext } from "~/auth.server/serverContext";
import { getAuthenticatedSession } from "~/auth.server/sessions";
import { AccountBox } from "~/components/AccountBox";
import { Legal } from "~/components/Legal";
import { PageModal } from "~/components/PageModal";
import { PresentClient } from "~/components/PresentClient";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import OidcClients from "~/db.server/oidc_clients";
import OidcConsents from "~/db.server/oidc_consents";
import type { UserWithTenant } from "~/db.server/users.server";
import { storeConsent } from "~/lib.server/consent.server";
import { dbClientToClient, dbSessionToSession } from "~/lib.server/interface";
import {
  getOidcAuthorizationRequest,
  oidcAuthorizationCookie,
} from "~/lib.server/oidc";
import {
  buildAuthorizationResponse,
  returnToClient,
} from "~/lib.server/oidcServer";
import { localeContext } from "~/root";
import { makeClientOidcClient } from "~/types/ClientOidcClient";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const oidcAuthRequest = await getOidcAuthorizationRequest(request);
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const user = await context.get(userContext);
  if (!user) {
    console.warn("No user found for session");
    return redirect("/oidc/select");
  }

  const client = await OidcClients.find(
    humanIdToUuid(oidcAuthRequest.client_id, "oidc")!,
  );
  if (!client) {
    return redirect("/");
  }

  if (client.tenantId && client.tenantId !== user.tenant?.id) {
    return redirect("/oidc/select");
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const consent = await OidcConsents.findOrInitialize(client.id, user.id);

  const locale = context.get(localeContext).locale;
  const clientFields = makeClientOidcClient(client, locale);

  const scopes = oidcAuthRequest.scopes;
  const claims = oidcAuthRequest.claims;
  const claimKeys = Object.keys({ ...claims.id_token, ...claims.userinfo });

  // openid is automatically granted
  consent.scopes.push("openid");

  const missingScopes = scopes.filter((s) => !consent?.scopes.includes(s));
  const missingClaims = Array.from(claimKeys).filter(
    (c) => !consent?.claims.includes(c),
  );

  return {
    client: clientFields,
    missingClaims: cleanupClaims(missingClaims),
    missingScopes,
    isFormPost: oidcAuthRequest.response_mode === "form_post",
  };
}

export default function OidcConsentPage() {
  const { client, missingClaims, isFormPost } = useLoaderData<typeof loader>();
  const user = useAuth();
  const t = useTranslations();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient
          client={client}
          descriptionKey="consent.title"
          descriptionClassName="text-2xl"
          append={<Legal client={client} className="me-16 hidden lg:block" />}
        />
        <div>
          <AccountBox user={user} />
          <p className="mb-4">
            <a
              href="/select"
              className="py-2.5 inline-block text-blue-600 dark:text-hc-link text-sm"
            >
              {t("oidc.change_account")}
            </a>
          </p>

          {missingClaims.length > 0 && (
            <>
              <p className="my-4">
                {t.rich("oidc.consent.description", {
                  name: client.clientName ?? "",
                  strong: (children) => <strong>{children}</strong>,
                })}
              </p>
              <ul className="list-disc px-4 flex flex-col space-y-1">
                {missingClaims.map((claim) => (
                  <li key={claim}>{t("oidc.consent.claims." + claim)}</li>
                ))}
              </ul>
            </>
          )}

          {/*
            In case of form_post response_types we must reload the page as
            the regular CSP header will forbid redirects to third party
            origins. Forcing a reload post-redirect will load the CSP header
            of the form-post route, which does allow open form submissions.
          */}
          <Form method="POST" reloadDocument={isFormPost}>
            <div className="flex gap-4 justify-end">
              <Button
                type="submit"
                name="consent"
                disabled={isSubmitting}
                value={"yes"}
                data-testid="consentSubmit"
              >
                {t("common.continue")}
              </Button>
            </div>
          </Form>
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}

function cleanupClaims(claims: string[]): string[] {
  const clean: string[] = [];
  for (const claim of claims) {
    switch (claim) {
      case "name":
      case "given_name":
      case "family_name":
      case "middle_name":
      case "nickname":
        clean.push("name");
        break;
      case "preferred_username":
        clean.push("username");
        break;
      case "profile":
      case "picture":
      case "website":
        clean.push("profile");
        break;
      case "email":
      case "email_verified":
        clean.push("email");
        break;
      case "phone_number":
      case "phone_number_verified":
        clean.push("phone_number");
        break;
      case "address":
        clean.push("address");
        break;
      case "gender":
        clean.push("gender");
        break;
      case "birthdate":
        clean.push("birthdate");
        break;
    }
  }

  return Array.from(new Set(clean));
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await context.get(userContext);
  if (!user) {
    console.warn("No user found for session");
    return redirect("/oidc/select");
  }

  const oidcAuthRequest = await getOidcAuthorizationRequest(request);
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const formData = await request.formData();
  const consent = formData.get("consent") as string;

  if (consent === "yes") {
    return await handleConsent(request, oidcAuthRequest, user);
  } else {
    // TODO
    throw new Error("User denied consent");
  }
}

async function handleConsent(
  request: Request,
  oidcAuthRequest: AuthorizationRequest,
  user: UserWithTenant,
) {
  const session = (await getAuthenticatedSession(request, user.id))!;

  const clientId = humanIdToUuid(oidcAuthRequest.client_id, "oidc")!;
  const client = await OidcClients.find(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  if (client.tenantId && client.tenantId !== user.tenant?.id) {
    // The user cannot consent to this client, as it is not in the same tenant.
    return redirect("/oidc/select");
  }

  await storeConsent(
    user.id,
    clientId,
    oidcAuthRequest.scopes,
    oidcAuthRequest.claims,
  );

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

  if (result.nextStep === "REDIRECT") {
    return redirect(result.url!, responseArgs);
  } else if (result.nextStep === "FORM_POST") {
    const escapedUrl = encodeURIComponent(oidcAuthRequest.redirect_uri);
    const escapedParams = encodeURIComponent(JSON.stringify(result.data));

    return redirect(
      `/oidc/form-post?redirect_uri=${escapedUrl}&params=${escapedParams}`,
      responseArgs,
    );
  } else {
    throw new Error("unsupported nextStep");
  }
}
