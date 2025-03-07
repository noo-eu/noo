import { useTranslations } from "next-intl";
import { PresentClientClientProps } from "./PresentClient";

type Props = {
  client: PresentClientClientProps;
  className?: string;
};

export function Legal({ client, className }: Props) {
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
    client: client.name,
    privacy: (children: React.ReactNode) =>
      externalLink(client.privacyUrl!, children),
    terms: (children: React.ReactNode) =>
      externalLink(client.tosUrl!, children),
  };

  let legalKey;
  if (client.privacyUrl && client.tosUrl) {
    legalKey = "legalComplete";
  } else if (client.privacyUrl) {
    legalKey = "legalPrivacy";
  } else if (client.tosUrl) {
    legalKey = "legalTerms";
  } else {
    legalKey = "legalNone";
  }
  const legalText = t.rich(`switch.${legalKey}`, legalParams);

  return <p className={`text-sm ${className}`}>{legalText}</p>;
}
