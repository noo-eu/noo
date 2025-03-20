import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";

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
        genderCustom: user.genderCustom || "",
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
