import { ClientSession } from "@/lib/types/ClientSession";
import { SessionItem } from "./SessionItem";

type Props = {
  name: string;
  sessions: ClientSession[];
  currentSessionId: string;
};

export function SessionsGroup({
  name,
  sessions,
  currentSessionId,
}: Readonly<Props>) {
  return (
    <div className="w-full border border-black/25 dark:border-white/25 rounded-lg p-8 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <h2 className="text-2xl font-medium">{name}</h2>
      <div className="grid grid-cols-1 gap-6 divide-y divide-black/25 dark:divide-white/25">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isActive={session.id === currentSessionId}
          />
        ))}
      </div>
    </div>
  );
}
