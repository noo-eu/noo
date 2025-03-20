import { updatePassword } from "@/app/security/password/actions";
import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { useActionState } from "react";
import { toast } from "react-toastify/unstyled";

export function usePasswordForm() {
  const t = useTranslations("security");
  const user = useAuth();

  const [state, formAction, isPending] = useActionState(
    withCallbacks(updatePassword.bind(null, user.id), {
      onSuccess: () => {
        toast.success(t("password.updateSuccess"));
        redirect(`/security?uid=${user.id}`);
      },
    }),
    { input: { "new-password": "", "new-password-confirmation": "" } },
  );

  return {
    state,
    errors: state.error,
    isPending,
    formAction,
  };
}
