import { useAuth } from "@/auth/authContext";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { redirect } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { withCallbacks } from "~/components/withCallbacks";

export function useBirthdateForm(
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>,
) {
  const t = useTranslations("profile");
  const user = useAuth();

  const day = user.birthdate?.getDate().toString() ?? "";
  const month = ((user.birthdate?.getMonth() ?? 0) + 1).toString();
  const year = user.birthdate?.getFullYear().toString() ?? "";

  const [state, formAction, isPending] = useActionState(
    withCallbacks(action, {
      onSuccess: () => {
        toast.success(t("birthdate.updateSuccess"));
        redirect(`/profile?uid=${user.id}`);
      },
    }),
    { input: { day, month, year } },
  );

  return {
    errors: state.error,
    state,
    isPending,
    formAction,
  };
}
