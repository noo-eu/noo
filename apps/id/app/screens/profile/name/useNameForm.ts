import { startTransition, useState } from "react";
import { useNavigate, type FetcherWithComponents } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";
import { capitalizeName } from "~/lib.server/name";
import { useCallbacks } from "~/lib.server/withCallbacks";

export function useNameForm(
  fetcher: FetcherWithComponents<{ error: Record<string, string | undefined> }>,
) {
  const t = useTranslations("profile");
  const user = useAuth();
  const navigate = useNavigate();

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("name.updateSuccess"));
      navigate(`/profile?uid=${encodeURIComponent(user.id)}`);
    },
  });

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fn = capitalizeName(firstName);
    const ln = capitalizeName(lastName ?? "");
    setFirstName(fn);
    setLastName(ln);

    const data = new FormData();
    data.append("firstName", fn);
    data.append("lastName", ln);

    startTransition(() => {
      fetcher.submit(data, { method: "POST" });
    });
  };

  return {
    errors: fetcher.data?.error,
    form: { firstName, setFirstName, lastName, setLastName },
    onSubmit,
  };
}
