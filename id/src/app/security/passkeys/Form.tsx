"use client";

import {
  ConfirmationProvider,
  useWithConfirmation,
} from "@/components/Confirmation";
import { Noo } from "@/components/Noo";
import { withCallbacks } from "@/components/withCallbacks";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Button, TextInput } from "@noo/ui";
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "react-toastify/unstyled";
import {
  changePasskeyName,
  registrationOptions,
  removePasskey,
  verifyRegistration,
} from "./actions";
import { useAuth } from "@/lib/authContext";

export type PasskeysPageFormProps = {
  existingPasskeys: {
    id: string;
    name: string;
    createdAt: Date;
    lastUsedAt: Date;
  }[];
};

export function PasskeysPageForm({ existingPasskeys }: PasskeysPageFormProps) {
  const t = useTranslations("security.passkeys");
  const { id: userId } = useAuth();

  const registerPasskey = async (e: React.FormEvent) => {
    e.preventDefault();

    const options = await registrationOptions(userId);
    if (options.error) {
      console.error("Error registering passkey:", options.error);
      return;
    }

    try {
      const registrationResponse = await startRegistration({
        optionsJSON: options.data as PublicKeyCredentialCreationOptionsJSON,
      });
      await verifyRegistration(userId, registrationResponse);
    } catch (error) {
      console.error("Error registering passkey:", error);
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto p-4 w-full">
      <h1 className="text-4xl font-medium mt-12 mb-6 text-center">
        {t("title")}
      </h1>

      <p className="mb-8">{t.rich("description1", { noo: () => <Noo /> })}</p>

      <p className="mb-8">{t("description2")}</p>

      <form onSubmit={registerPasskey} className="max-w-sm mx-auto">
        <Button type="submit" kind="plain">
          <PlusIcon className="h-5 w-5 mr-1" />
          {t("register")}
        </Button>
      </form>

      {existingPasskeys.length > 0 && (
        <div className="mt-8 border border-black/15 dark:border-white/25 rounded p-8">
          <h2 className="text-2xl font-medium mb-4">{t("yourPasskeys")}</h2>

          <ConfirmationProvider>
            <ul className="divide-y divide-black/15 dark:divide-white/25">
              {existingPasskeys.map((passkey) => (
                <Passkey passkey={passkey} key={passkey.id} />
              ))}
            </ul>
          </ConfirmationProvider>
        </div>
      )}
    </div>
  );
}

function Passkey({
  passkey,
}: {
  passkey: PasskeysPageFormProps["existingPasskeys"][0];
}) {
  const t = useTranslations("security.passkeys");
  const commonT = useTranslations("common");
  const format = useFormatter();

  const withConfirmation = useWithConfirmation();
  const router = useRouter();

  const { id: userId } = useAuth();

  const destroy = async () => {
    if ((await removePasskey(userId, passkey.id)).error) {
      toast.error(t("removeError"));
      return;
    } else {
      toast.success(t("removeSuccess"));
      router.refresh();
    }
  };

  return (
    <li
      key={passkey.id}
      className="flex justify-between items-center px-2 py-4"
    >
      <div>
        <PasskeyName passkey={passkey} />
        <div className="text-sm text-gray-500">
          <div>
            {t("created", {
              date: passkey.createdAt,
            })}
          </div>
          <div>
            {t("lastUsed", {
              ago: format.dateTime(passkey.lastUsedAt, {
                dateStyle: "medium",
              }),
            })}
          </div>
        </div>
      </div>

      <Button
        size="sm"
        kind="warning"
        form="outline"
        title={commonT("remove")}
        onClick={withConfirmation(destroy, {
          message: t("confirmRemove"),
          positiveKind: "warning",
        })}
      >
        <TrashIcon className="h-5 w-5" />
      </Button>
    </li>
  );
}

function PasskeyName({
  passkey,
}: {
  passkey: PasskeysPageFormProps["existingPasskeys"][0];
}) {
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
