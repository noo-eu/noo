import { useActionData, useFetcher } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { useCallbacks } from "~/lib.server/withCallbacks";

export function useLanguageForm() {
  const t = useTranslations("settings");
  const user = useAuth();
  const fetcher = useFetcher();
  const isPending = fetcher.state === "submitting";

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("language.updateSuccess"));
      window.location.href = "/settings?uid=" + user.id;
    },
  });

  const data = useActionData<typeof fetcher.data>();

  return {
    errors: data?.errors,
    isPending,
    Form: fetcher.Form,
  };
}
