import { useTranslations } from "use-intl";
import ProfileLayout from "~/screens/home/ProfileLayout";
import type { ClientSession } from "~/types/ClientSession.client";
import { SessionsGroup } from "./SessionGroup";
import { useGroupedSessions } from "./useGroupedSession";

type Props = {
  sessions: ClientSession[];
  currentSessionId: string;
};

export function SessionsPage({ sessions, currentSessionId }: Readonly<Props>) {
  const t = useTranslations("security");

  const groupedByDevice = useGroupedSessions(sessions);

  return (
    <ProfileLayout>
      <div className="flex flex-col items-center max-w-3xl mx-auto p-4 w-full">
        <h1 className="text-4xl font-medium mt-12 mb-16">
          {t("sessions.title")}
        </h1>

        {Object.entries(groupedByDevice).map(([key, sessions]) => {
          return (
            <SessionsGroup
              key={key}
              name={key}
              sessions={sessions}
              currentSessionId={currentSessionId}
            />
          );
        })}
      </div>
    </ProfileLayout>
  );
}
