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

  const legalMessage =
    client.privacyUrl && client.tosUrl
      ? "legalComplete"
      : client.privacyUrl
        ? "legalPrivacy"
        : client.tosUrl
          ? "legalTerms"
          : "legalNone";
  const legalText = t.rich(`switch.${legalMessage}`, legalParams);

  return <p className={`text-sm ${className}`}>{legalText}</p>;
}
