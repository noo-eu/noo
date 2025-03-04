import { getSessionCookie, SessionsService } from "@/lib/SessionsService";

async function getSessions() {
  const manager = new SessionsService(await getSessionCookie());
  return manager.activeSessions();
}

export default async function AccountSwitcherPage() {
  const sessions = await getSessions();

  return (
    <>
      <h1 className="text-3xl text-center mb-8">Choose an account</h1>

      <div className="flex flex-col gap-1">
        {sessions.map((session) => (
          <a
            key={session.id}
            href={`/oidc/continue?sid=${session.id}`}
            className="block hover:bg-gray-100 dark:hover:bg-gray-800 py-3 px-5 rounded-lg"
          >
            <div className="text-md font-semibold">
              {session.user.firstName} {session.user.lastName}
            </div>
            <div className="text-gray-400">
              {session.user.username}@
              {session.user.tenant?.domain || "noomail.eu"}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
