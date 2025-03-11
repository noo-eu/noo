import { Noo } from "@/components/Noo";
import { PageModal } from "@/components/PageModal";
import { PresentClient } from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import OidcClients from "@/db/oidc_clients";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { Form } from "./Form";
import { PresentNoo } from "./PresentNoo";

export default async function SigninPage() {
  const oidcAuthorization = await getOidcAuthorizationRequest();

  return (
    <>
      {oidcAuthorization && <SignInWithNoo />}
      <PageModal.Modal>
        <LeftPanel />
        <div>
          <Form />
        </div>
      </PageModal.Modal>
    </>
  );
}

async function LeftPanel() {
  const oidcAuthorization = await getOidcAuthorizationRequest();
  const t = await getTranslations("signin");
  const locale = await getLocale();

  if (oidcAuthorization) {
    const client = (await OidcClients.find(oidcAuthorization.client_id))!;

    const clientFields = {
      name: getLocalizedOidcField(client, "clientName", locale)!,
      logo: getLocalizedOidcField(client, "logoUri", locale),
    };

    const title = t.rich("title", { noo: () => <Noo /> });

    return <PresentClient client={clientFields} title={title} />;
  }

  return <PresentNoo />;
}
