import { getActiveSessions } from "@/auth/sessions";
import OidcClients from "@/db/oidc_clients";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountSwitcher } from "@/screens/account_switcher/AccountSwitcher";

export async function generateMetadata() {
  const t = await getTranslations("oidc");

  return {
    title: t("switch.metaTitle"),
    description: "",
  };
}

export default async function Page() {
  const oidcAuthRequest = await getOidcAuthorizationRequest();

  if (!oidcAuthRequest) {
    // The account switcher is only used in the context of an OIDC authorization
    return redirect("/");
  }

  const client = await OidcClients.find(oidcAuthRequest.client_id);
  if (!client) {
    return redirect("/");
  }

  const sessions = await getActiveSessions();
  if (sessions.length === 0) {
    return redirect("/");
  }

  return (
    <AccountSwitcher
      oidcAuthRequest={oidcAuthRequest}
      client={client}
      sessions={sessions}
    />
  );
}
