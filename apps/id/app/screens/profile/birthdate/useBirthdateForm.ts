import { useActionData, useFetcher, useNavigate } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { useCallbacks } from "~/lib.server/withCallbacks";

export function useBirthdateForm() {
  const fetcher = useFetcher();

  const t = useTranslations("profile");
  const user = useAuth();
  const navigate = useNavigate();

  const data = useActionData<typeof fetcher.data>();

  const input = data?.input ?? {
    day: user.birthdate?.getDate().toString() ?? "",
    month: ((user.birthdate?.getMonth() ?? 0) + 1).toString(),
    year: user.birthdate?.getFullYear().toString() ?? "",
  };

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("birthdate.updateSuccess"));
      navigate(`/profile?uid=${encodeURIComponent(user.id)}`);
    },
  });

  return {
    input,
    errors: data?.error,
    isPending: fetcher.state === "submitting",
    Form: fetcher.Form,
  };
}
