import { getUserForSession } from "@/auth/SessionsService";
import { AccountBox } from "@/components/AccountBox";
import { Legal } from "@/components/Legal";
import { PageModal } from "@/components/PageModal";
import { PresentClient } from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import OidcClients from "@/db/oidc_clients";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Form from "./Form";

export const revalidate = 0;

export default async function OidcContinuePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ sid: string }>;
}>) {
  const t = await getTranslations();

  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const sessionId = (await searchParams).sid;
  if (!sessionId) {
    return redirect("/switch");
  }

  const user = await getUserForSession(sessionId);
  if (!user) {
    return redirect("/switch");
  }

  if (oidcAuthRequest.tenantId && oidcAuthRequest.tenantId !== user.tenantId) {
    return redirect("/switch");
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const client = await OidcClients.find(
    humanIdToUuid(oidcAuthRequest.client_id, "oidc")!,
  );
  if (!client) {
    return redirect("/");
  }

  const locale = await getLocale();

  const clientFields = {
    name: getLocalizedOidcField(client, "clientName", locale)!,
    logo: getLocalizedOidcField(client, "logoUri", locale),
    privacyUrl: getLocalizedOidcField(client, "policyUri", locale),
    tosUrl: getLocalizedOidcField(client, "tosUri", locale),
  };

  const userFields = {
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: `${user.username}@${user.tenant?.domain ?? "noomail.eu"}`,
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

          <Form sessionId={sessionId} />

          <Legal client={clientFields} className="mt-8 lg:hidden" />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
