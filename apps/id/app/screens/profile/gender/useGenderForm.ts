import { useFetcher, useNavigate } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { useCallbacks } from "~/lib.server/withCallbacks";

export function useGenderForm() {
  const fetcher = useFetcher();

  const t = useTranslations("profile");
  const user = useAuth();
  const navigate = useNavigate();

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("gender.updateSuccess"));
      navigate(`/profile?uid=${user.id}`);
    },
  });

  return {
    errors: fetcher.data?.error,
    isPending: fetcher.state === "submitting",
    Form: fetcher.Form,
  };
}
