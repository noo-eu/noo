import { useAuth } from "@/auth/authContext";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { redirect, useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { withCallbacks } from "~/components/withCallbacks";

export function useLanguageForm(
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>,
) {
  const t = useTranslations("settings");
  const user = useAuth();
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    withCallbacks(action, {
      onSuccess: () => {
        toast.success(t("language.updateSuccess"));
        router.refresh();
        redirect(`/settings?uid=${user.id}`);
      },
    }),
    { input: { language: user.locale } },
  );

  return {
    errors: state.error,
    state,
    isPending,
    formAction,
  };
}
