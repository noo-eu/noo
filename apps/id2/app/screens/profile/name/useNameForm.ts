import { startTransition, useState } from "react";
import { useNavigate, type FetcherWithComponents } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth/context";
import { capitalizeName } from "~/lib/name";
import { useCallbacks } from "~/lib/withCallbacks";

export function useNameForm(fetcher: FetcherWithComponents<any>) {
  const t = useTranslations("profile");
  const user = useAuth();
  const navigate = useNavigate();

  useCallbacks(fetcher, {
    onSuccess: () => {
      toast.success(t("name.updateSuccess"));
      navigate(`/profile?uid=${user.id}`);
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
