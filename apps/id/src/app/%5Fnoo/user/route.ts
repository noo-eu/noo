import Sessions from "@/db/sessions";
import { humanIdToUuid } from "@/utils";

export async function POST(request: Request) {
  const data = await request.json();

  const sessionId = humanIdToUuid(data.sessionId, "sess");
  const userId = humanIdToUuid(data.id, "usr");

  if (!sessionId || !userId) {
    return new Response(JSON.stringify({}), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  const session = await Sessions.find(sessionId);
  if (!session || session.userId !== userId) {
    return new Response(JSON.stringify({}), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
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
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
