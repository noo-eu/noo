import { useAuth } from "@/auth/authContext";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { redirect } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { withCallbacks } from "~/components/withCallbacks";

export function useGenderForm(
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>,
) {
  const t = useTranslations("profile");
  const user = useAuth();

  const [state, formAction, isPending] = useActionState(
    withCallbacks(action, {
      onSuccess: () => {
        toast.success(t("gender.updateSuccess"));
        redirect(`/profile?uid=${user.id}`);
      },
    }),
    {
      input: {
        gender: user.gender,
        genderCustom: user.genderCustom ?? "",
        pronouns: user.pronouns,
      },
    },
  );

  return {
    errors: state.error,
    isPending,
    formAction,
  };
}
