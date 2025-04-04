import { Noo } from "@noo/ui/Noo";
import { useTranslations } from "use-intl";
import { PresentClient } from "~/components/PresentClient";
import type { ClientOidcClient } from "~/types/ClientOidcClient";

export function SignInSidePanel({
  oidcClient,
}: {
  oidcClient?: ClientOidcClient;
}) {
  const t = useTranslations("signin");

  if (oidcClient) {
    const title = t.rich("title", { noo: () => <Noo /> });

    return <PresentClient client={oidcClient} title={title} />;
  }

  return (
    <div>
      <img
        src="https://static.noo.eu/favicon.svg"
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
