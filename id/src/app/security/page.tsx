import { SessionsService } from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { redirect } from "next/navigation";
import SecurityHomePage from "./SecurityHomePage";
import Sessions from "@/db/sessions";
import { eq } from "drizzle-orm";
import { schema } from "@/db";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const dbUser = await SessionsService.user((await searchParams).uid);
  if (!dbUser) {
    redirect("/signin");
  }

  const user = {
    id: uuidToHumanId(dbUser.id, "usr"),
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    picture: dbUser.picture,
    birthdate: dbUser.birthdate,
    gender: dbUser.gender,
    genderCustom: dbUser.genderCustom,
    pronouns: dbUser.pronouns,
    passwordBreaches: dbUser.passwordBreaches,
    passwordChangedAt: dbUser.passwordChangedAt!,
  };

  const activeSessions = await Sessions.countBy(
    eq(schema.sessions.userId, dbUser.id),
  );

  return <SecurityHomePage user={user} activeSessions={activeSessions} />;
}
