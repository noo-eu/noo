import { TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@noo/ui";
import { toast } from "react-toastify/unstyled";
import { useFormatter, useTranslations } from "use-intl";
import { useAuth } from "~/auth/context";
import { useWithConfirmation } from "~/components/Confirmation";
import { type ClientPasskey } from "~/lib/types/ClientPasskey.client";
import { PasskeyNameEditor } from "./PasskeyNameEditor";

export function PasskeyItem({ passkey }: Readonly<{ passkey: ClientPasskey }>) {
  const t = useTranslations("security.passkeys");
  const commonT = useTranslations("common");
  const format = useFormatter();

  const withConfirmation = useWithConfirmation();

  const { id: userId } = useAuth();

  const destroy = async () => {
    if ((await removePasskey(userId, passkey.id))?.error) {
      toast.error(t("removeError"));
    } else {
      toast.success(t("removeSuccess"));
      window.location.reload();
    }
  };

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
