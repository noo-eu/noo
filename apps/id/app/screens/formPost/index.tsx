import { Button } from "@noo/ui";
import { useEffect } from "react";
import { useTranslations } from "use-intl";

type Props = {
  redirectUri: string;
  params: Record<string, string | undefined>;
};

export default function FormPost({ redirectUri, params }: Props) {
  const t = useTranslations("common");

  useEffect(() => {
    const form = document.getElementById("form") as HTMLFormElement;
    if (form) {
      form.submit();
    }
  }, []);

  return (
    <form method="POST" action={redirectUri} id="form">
      {Object.entries(params).map(([key, value]) => (
        <input type="hidden" name={key} value={value} key={key} />
      ))}
      <noscript>
        <Button type="submit" id="submit">
          {t("continue")}
        </Button>
      </noscript>
    </form>
  );
}
