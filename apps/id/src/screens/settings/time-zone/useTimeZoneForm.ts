import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";

export function useTimeZoneForm(
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>,
) {
  const t = useTranslations("settings");
  const user = useAuth();

  const [state, formAction, isPending] = useActionState(
    withCallbacks(action, {
      onSuccess: () => {
        toast.success(t("timeZone.updateSuccess"));
        redirect(`/settings?uid=${user.id}`);
      },
    }),
    { input: { timeZone: user.timeZone } },
  );

  return {
    errors: state.error,
    state,
    isPending,
    formAction,
  };
}
