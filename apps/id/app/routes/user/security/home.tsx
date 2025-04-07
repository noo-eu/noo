import { eq } from "drizzle-orm";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { withAuth } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import { schema } from "~/db.server";
import Sessions from "~/db.server/sessions";
import SecurityHub from "~/screens/security/Hub";

export const loader = withAuth(async ({ context }: LoaderFunctionArgs) => {
  const user = context.get(userContext);

  const activeSessions = await Sessions.countBy(
    eq(schema.sessions.userId, user.id),
  );

  return {
    activeSessions: activeSessions,
  };
});

export default function Page() {
  const { activeSessions } = useLoaderData<typeof loader>();

  return <SecurityHub activeSessions={activeSessions} />;
}
