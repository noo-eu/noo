import { TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "react-toastify/unstyled";
import { useFormatter, useTranslations } from "use-intl";
import { useWithConfirmation } from "~/components/Confirmation";
import { type ClientPasskey } from "~/types/ClientPasskey.client";
import { PasskeyNameEditor } from "./PasskeyNameEditor";

export function PasskeyItem({ passkey }: Readonly<{ passkey: ClientPasskey }>) {
  const t = useTranslations("security.passkeys");
  const commonT = useTranslations("common");
  const format = useFormatter();

  const withConfirmation = useWithConfirmation();

  const destroyFetcher = useFetcher();

  const destroy = () => {
    const formData = new FormData();
    formData.append("passkeyId", passkey.id);

    destroyFetcher.submit(formData, {
      method: "DELETE",
    });
  };

  useEffect(() => {
    const result = destroyFetcher.data;

    if (result && result.deleted) {
      toast.success(t("removeSuccess"));
    } else if (result && result.error) {
      toast.error(t("removeError"));
    }
  }, [t, destroyFetcher.data]);

  return (
    <li
      key={passkey.id}
      className="flex justify-between items-center px-2 py-4"
    >
      <div>
        <PasskeyNameEditor passkey={passkey} />
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

      <destroyFetcher.Form
        method="DELETE"
        onSubmit={withConfirmation(destroy, {
          message: t("confirmRemove"),
          positiveKind: "warning",
        })}
      >
        <Button
          size="sm"
          kind="warning"
          form="outline"
          title={commonT("remove")}
        >
          <TrashIcon className="h-5 w-5" />
        </Button>
      </destroyFetcher.Form>
    </li>
  );
}
