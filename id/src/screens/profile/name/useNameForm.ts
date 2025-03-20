import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { capitalizeName } from "@/lib/name";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
import { useActionState, useState, startTransition } from "react";
import { toast } from "react-toastify/unstyled";

export function useNameForm(
  action: (_: unknown, data: FormData) => Promise<BasicFormAction>,
) {
  const t = useTranslations("profile");
  const user = useAuth();

  const [state, formAction, isPending] = useActionState(
    withCallbacks(action, {
      onSuccess: () => {
        toast.success(t("name.updateSuccess"));
        redirect(`/profile?uid=${user.id}`);
      },
    }),
    { input: { firstName: user.firstName, lastName: user.lastName || "" } },
  );

  const [firstName, setFirstName] = useState(state.input.firstName);
  const [lastName, setLastName] = useState(state.input.lastName);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fn = capitalizeName(firstName);
    const ln = capitalizeName(lastName || "");
    setFirstName(fn);
    setLastName(ln);

    const data = new FormData();
    data.append("firstName", fn);
    data.append("lastName", ln);

    startTransition(() => {
      formAction(data);
    });
  };

  return {
    errors: state.error,
    isPending,
    form: { firstName, setFirstName, lastName, setLastName },
    onSubmit,
    formAction,
  };
}
