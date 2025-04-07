import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { eq } from "drizzle-orm";
import { redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { withAuth } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import { getAuthenticatedSession } from "~/auth.server/sessions";
import { sessions } from "~/db.server/schema";
import Sessions from "~/db.server/sessions";
import { SessionsPage } from "~/screens/security/sessions/SessionsPage";
import { makeClientSession } from "~/types/ClientSession";

export const loader = withAuth(
  async ({ request, context }: LoaderFunctionArgs) => {
    const user = context.get(userContext);

    const allSessions = await Sessions.findManyBy(eq(sessions.userId, user.id));
    const clientSessions = allSessions.map(makeClientSession);

    const currentSessionId = (await getAuthenticatedSession(request, user.id))
      ?.id;
    if (!currentSessionId) {
      throw redirect("/signin");
    }

    return {
      sessions: clientSessions,
      currentSessionId: uuidToHumanId(currentSessionId, "sess"),
    };
  },
);

export default function Page() {
  const { sessions, currentSessionId } = useLoaderData<typeof loader>();

  return (
    <SessionsPage sessions={sessions} currentSessionId={currentSessionId} />
  );
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const user = context.get(userContext);
  if (!user) {
    throw redirect("/signin");
  }

  const formData = await request.formData();
  const id = formData.get("id") as string;

  const sessionId = humanIdToUuid(id, "sess")!;
  await Sessions.destroy(sessionId);

  return {};
}
