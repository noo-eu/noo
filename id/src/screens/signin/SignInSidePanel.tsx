import Image from "@/components/Image";
import { Noo } from "@/components/Noo";
import { PresentClient } from "@/components/PresentClient";
import OidcClients from "@/db/oidc_clients";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { getLocale, getTranslations } from "next-intl/server";

export async function SignInSidePanel() {
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

  return (
    <div>
      <Image
        src="/favicon.svg"
        alt="noo"
        className="w-16 h-16 mb-8"
        width={64}
        height={64}
      />
      <h1 className="text-2xl mb-8">
        {t.rich("title", { noo: () => <Noo /> })}
      </h1>
    </div>
  );
}
