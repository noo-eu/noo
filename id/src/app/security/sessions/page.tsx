import { SessionsService } from "@/auth/SessionsService";
import { withAuth } from "@/auth/withAuth";
import { sessions } from "@/db/schema";
import Sessions from "@/db/sessions";
import { User } from "@/db/users";
import { makeClientSession } from "@/lib/types/ClientSession";
import { SessionsPage } from "@/screens/security/sessions/SessionsPage";
import { uuidToHumanId } from "@/utils";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata() {
  const t = await getTranslations("security");

  return {
    title: t("sessions.title"),
    description: "",
  };
}

async function Page({ user }: Readonly<{ user: User }>) {
  const allSessions = await Sessions.findManyBy(eq(sessions.userId, user.id));
  const clientSessions = allSessions.map(makeClientSession);

  const currentSessionId = (await SessionsService.sessionFor(user.id))?.id;
  if (!currentSessionId) {
    redirect("/signin");
  }

  return (
    <SessionsPage
      sessions={clientSessions}
      currentSessionId={uuidToHumanId(currentSessionId, "sess")}
    />
  );
}

export default withAuth(Page);
