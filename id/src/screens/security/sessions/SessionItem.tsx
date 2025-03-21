import { terminateSession } from "@/app/security/sessions/actions";
import { useAuth } from "@/auth/authContext";
import { withCallbacks } from "@/components/withCallbacks";
import { ClientSession } from "@/lib/types/ClientSession";
import { CheckBadgeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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

  const userId = useAuth().id;

  const router = useRouter();
  const action = withCallbacks(
    terminateSession.bind(null, userId, session.id),
    {
      onSuccess: () => {
        router.refresh();
      },
    },
  );

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
            lastUsedAgo: formatter.relativeTime(session.lastUsedAt),
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
          <form action={action}>
            <button
              title="End session"
              className="cursor-pointer p-2 rounded-full bg-red-700/15 hover:bg-red-700/35 text-red-700 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
