import { useActionData, useFetcher, useNavigate } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { useCallbacks } from "~/lib.server/withCallbacks";

export function useTimeZoneForm() {
  const t = useTranslations("settings");
  const user = useAuth();
  const fetcher = useFetcher();
  const isPending = fetcher.state === "submitting";
  const navigate = useNavigate();

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("timeZone.updateSuccess"));
      navigate(`/settings?uid=${encodeURIComponent(user.id)}`);
    },
  });

  const data = useActionData<typeof fetcher.data>();

  return {
    errors: data?.errors,
    isPending,
    Form: fetcher.Form,
  };
}
