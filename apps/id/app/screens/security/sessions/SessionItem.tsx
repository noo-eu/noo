import { CheckBadgeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useFetcher } from "react-router";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { useCallbacks } from "~/lib.server/withCallbacks";
import type { ClientSession } from "~/types/ClientSession.client";
import { cleanIp } from "./ipUtils";
import { userAgentToDevice } from "./userAgentUtils";

export function SessionItem({
  session,
  isActive,
}: Readonly<{
  session: ClientSession;
  isActive: boolean;
}>) {
  const formatter = useFormatter();
  const ua = userAgentToDevice(session.userAgent);
  const t = useTranslations("security");

  const fetcher = useFetcher();

  useCallbacks(fetcher, {
    onSuccess: () => {
      window.location.reload();
    },
  });

  const now = useNow();

  return (
    <div className="pb-6 last:pb-0 flex flex-row">
      <div>
        {ua.browser && (
          <p>
            <strong>{ua.browser}</strong>
          </p>
        )}
        <p>IP: {cleanIp(session.ip)}</p>
        <p>
          {t("sessions.lastUsed", {
            lastUsedAgo: formatter.relativeTime(session.lastUsedAt, now),
          })}
        </p>
        {isActive && (
          <p className="text-blue-700 flex items-center gap-2 mt-2">
            <CheckBadgeIcon className="w-6 h-6" />
            {t("sessions.currentSession")}
          </p>
        )}
      </div>
      <div className="ms-auto">
        {!isActive && (
          <fetcher.Form method="POST">
            <input type="hidden" name="id" value={session.id} />
            <button
              title={t("sessions.terminate")}
              className="cursor-pointer p-2 rounded-full bg-red-700/15 hover:bg-red-700/35 text-red-700 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </fetcher.Form>
        )}
      </div>
    </div>
  );
}
