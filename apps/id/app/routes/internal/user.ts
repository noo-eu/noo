import { humanIdToUuid } from "@noo/lib/humanIds";
import type { ActionFunctionArgs } from "react-router";
import Sessions from "~/db.server/sessions";

export function headers() {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();

  const sessionId = humanIdToUuid(data.sessionId, "sess");
  const userId = humanIdToUuid(data.id, "usr");

  if (!sessionId || !userId) {
    return new Response(JSON.stringify({}), {
      status: 404,
    });
  }

  const session = await Sessions.find(sessionId);
  if (!session || session.userId !== userId) {
    return new Response(JSON.stringify({}), {
      status: 404,
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: data.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        username: session.user.username,
        picture: session.user.picture,
        pronouns: session.user.pronouns,
        tenant: session.user.tenant?.id,
        tenantDomain: session.user.tenant?.domain,
        locale: session.user.locale,
      },
    }),
  );
}
