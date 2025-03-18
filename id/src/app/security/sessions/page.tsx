import ProfileLayout from "@/components/Profile/ProfileLayout";
import { sessions } from "@/db/schema";
import Sessions from "@/db/sessions";
import { SessionsService } from "@/lib/SessionsService";
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const userId = (await searchParams).uid!;
  const dbUser = await SessionsService.user(userId);
  if (!dbUser) {
    redirect("/signin");
  }

  const user = {
    firstName: dbUser.firstName,
    picture: dbUser.picture,
  };

  const allSessions = await Sessions.findManyBy(eq(sessions.userId, dbUser.id));
  const safeSessions = allSessions.map((session) => {
    return {
      id: uuidToHumanId(session.id, "sess"),
      ip: session.ip,
      userAgent: session.userAgent,
      lastUsedAt: session.lastUsedAt,
    };
  });

  const currentSessionId = (await SessionsService.sessionFor(userId))?.id;
  if (!currentSessionId) {
    redirect("/signin");
  }

  return (
    <ProfileLayout user={user}>
      <SessionsPage
        sessions={safeSessions}
        currentSessionId={currentSessionId}
        userId={userId}
      />
    </ProfileLayout>
  );
}
