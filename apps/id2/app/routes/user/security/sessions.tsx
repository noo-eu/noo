import { humanIdToUuid, uuidToHumanId } from "@noo/lib/humanIds";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { withAuth } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import { getAuthenticatedSession } from "~/auth/sessions";
import { sessions } from "~/db/schema";
import Sessions from "~/db/sessions";
import { makeClientSession } from "~/lib/types/ClientSession";
import { SessionsPage } from "~/screens/security/sessions/SessionsPage";

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

  console.log("sessions", currentSessionId);

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
