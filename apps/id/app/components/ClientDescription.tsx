import { useTranslations } from "use-intl";

type Props = {
  name?: string;
  descriptionKey?: string;
};

export function ClientDescription({ name, descriptionKey }: Readonly<Props>) {
  const t = useTranslations("oidc");

  return (
    <>
      {t.rich(descriptionKey ?? "switch.description", {
        name: name ?? "",
        details: (children) => (
          // TODO: Show contacts and host of redirect_uri on click
          <span className="font-medium">{children}</span>
        ),
      })}
    </>
  );
}
