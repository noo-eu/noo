import ProfileLayout from "@/components/Profile/ProfileLayout";
import { sessions } from "@/db/schema";
import Sessions from "@/db/sessions";
import { User } from "@/db/users";
import { SessionsService } from "@/lib/SessionsService";
import { withAuth } from "@/lib/withAuth";
import { uuidToHumanId } from "@/utils";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SessionsPage } from "./SessionsPage";

export async function generateMetadata() {
  const t = await getTranslations("security");

  return {
    title: t("sessions.title"),
    description: "",
  };
}

async function SecuritySessionsPage({ user }: { user: User }) {
  const allSessions = await Sessions.findManyBy(eq(sessions.userId, user.id));
  const safeSessions = allSessions.map((session) => {
    return {
      id: uuidToHumanId(session.id, "sess"),
      ip: session.ip,
      userAgent: session.userAgent,
      lastUsedAt: session.lastUsedAt,
    };
  });

  const currentSessionId = (await SessionsService.sessionFor(user.id))?.id;
  if (!currentSessionId) {
    redirect("/signin");
  }

  return (
    <ProfileLayout user={user}>
      <SessionsPage
        sessions={safeSessions}
        currentSessionId={currentSessionId}
        userId={user.id}
      />
    </ProfileLayout>
  );
}

export default withAuth(SecuritySessionsPage);
