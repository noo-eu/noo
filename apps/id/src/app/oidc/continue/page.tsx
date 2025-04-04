import { getAuthenticatedUser } from "@/auth/sessions";
import { AccountBox } from "@/components/AccountBox";
import { Legal } from "@/components/Legal";
import { PageModal } from "@/components/PageModal";
import { PresentClient } from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import OidcClients from "@/db/oidc_clients";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import "@/lib/oidc/setup";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getUserEmail } from "../consent/page";
import Form from "./Form";

export const revalidate = 0;

export default async function OidcContinuePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ uid: string }>;
}>) {
  const t = await getTranslations();

  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const clientId = humanIdToUuid(oidcAuthRequest.client_id, "oidc");
  if (!clientId) {
    return redirect("/");
  }

  const client = await OidcClients.find(clientId);
  if (!client) {
    console.warn("No OIDC client found");
    return redirect("/");
  }

  const userId = (await searchParams).uid;
  if (!userId) {
    return redirect("/switch");
  }

  const user = await getAuthenticatedUser(userId);
  if (!user) {
    return redirect("/switch");
  }

  if (client.tenantId && client.tenantId !== user.tenantId) {
    return redirect("/switch");
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const locale = await getLocale();

  const clientFields = {
    name: getLocalizedOidcField(client, "clientName", locale)!,
    logo: getLocalizedOidcField(client, "logoUri", locale),
    privacyUrl: getLocalizedOidcField(client, "policyUri", locale),
    tosUrl: getLocalizedOidcField(client, "tosUri", locale),
  };

  const userFields = {
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: getUserEmail(user),
    tenant: user.tenant?.name,
  };

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient
          client={clientFields}
          descriptionKey="consent.title"
          descriptionClassName="text-2xl"
          append={
            <Legal client={clientFields} className="me-16 hidden lg:block" />
          }
        />
        <div>
          <AccountBox user={userFields} />
          <p className="mb-4">
            <a href="/switch" className="link py-2.5 inline-block">
              {t("oidc.change_account")}
            </a>
          </p>

          <Form userId={userId} />

          <Legal client={clientFields} className="mt-8 lg:hidden" />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
