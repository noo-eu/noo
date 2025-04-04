import { changePasskeyName } from "@/app/security/passkeys/actions";
import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { ClientPasskey } from "@/lib/types/ClientPasskey";
import { CheckIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Button, TextInput } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

export function PasskeyNameEditor({
  passkey,
}: Readonly<{ passkey: ClientPasskey }>) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(passkey.name);

  const t = useTranslations("security.passkeys");
  const commonT = useTranslations("common");
  const router = useRouter();

  const { id: userId } = useAuth();

  const [, action, isPending] = useActionState(
    withCallbacks(changePasskeyName.bind(null, userId, passkey.id), {
      onSuccess: (data) => {
        router.refresh();
        setEditing(false);
        setName(data.input.name);
      },
    }),
    { data: null, input: { name: passkey.name } },
  );

  if (editing) {
    return (
      <form className="flex items-center gap-2 mb-1" action={action}>
        <TextInput type="text" defaultValue={passkey.name} name="name" />
        <Button
          type="submit"
          kind="plain"
          form="outline"
          title={commonT("save")}
          pending={isPending}
        >
          <CheckIcon className="h-5 w-5" />
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {passkey.name.length > 0 ? name : t("unnamed")}
      <Button
        kind="unstyled"
        className="cursor-pointer p-2 hover:bg-black/5 dark:hover:bg-white/25 rounded"
        title={commonT("change")}
        onClick={() => setEditing(true)}
      >
        <PencilIcon className="h-5 w-5" />
      </Button>
    </div>
  );
}
