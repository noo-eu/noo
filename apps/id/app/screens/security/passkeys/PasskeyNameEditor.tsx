import { CheckIcon, PencilIcon } from "@heroicons/react/24/solid";
import { Button, TextInput } from "@noo/ui";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useTranslations } from "use-intl";
import { useCallbacks } from "~/lib.server/withCallbacks";
import type { ClientPasskey } from "~/types/ClientPasskey.client";

export function PasskeyNameEditor({
  passkey,
}: Readonly<{ passkey: ClientPasskey }>) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(passkey.name);

  const t = useTranslations("security.passkeys");
  const commonT = useTranslations("common");

  const fetcher = useFetcher();

  useCallbacks(fetcher, {
    onSuccess: () => {
      setEditing(false);
      setName(name);
    },
  });

  if (editing) {
    return (
      <fetcher.Form method="PATCH" className="flex items-center gap-2 mb-1">
        <input type="hidden" name="passkeyId" value={passkey.id} />
        <TextInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          name="name"
        />
        <Button
          type="submit"
          kind="plain"
          form="outline"
          title={commonT("save")}
          pending={fetcher.state === "submitting"}
        >
          <CheckIcon className="h-5 w-5" />
        </Button>
      </fetcher.Form>
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
