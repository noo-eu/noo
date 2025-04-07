import { useTranslations } from "use-intl";
import type { ClientOidcClient } from "~/types/ClientOidcClient";

type Props = {
  client: ClientOidcClient;
  className?: string;
};

export function Legal({ client, className }: Readonly<Props>) {
  const t = useTranslations("oidc");

  const externalLink = (url: string, text: React.ReactNode) => (
    <a
      className="link font-medium cursor-pointer"
      target="_blank"
      rel="noopener noreferrer"
      href={url}
    >
      {text}
    </a>
  );

  const legalParams = {
    client: client.clientName!,
    privacy: (children: React.ReactNode) =>
      externalLink(client.privacyUri!, children),
    terms: (children: React.ReactNode) =>
      externalLink(client.tosUri!, children),
  };

  let legalKey;
  if (client.privacyUri && client.tosUri) {
    legalKey = "legalComplete";
  } else if (client.privacyUri) {
    legalKey = "legalPrivacy";
  } else if (client.tosUri) {
    legalKey = "legalTerms";
  } else {
    legalKey = "legalNone";
  }
  const legalText = t.rich(`switch.${legalKey}`, legalParams);

  return <p className={`text-sm ${className}`}>{legalText}</p>;
}
