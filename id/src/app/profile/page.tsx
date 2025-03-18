import { SessionsService } from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import ProfilePage from "./ProfileHomePage";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t.rich("title", { noo: () => "noo" }),
    description: "",
  };
}

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
  };

  return <ProfilePage user={user} />;
}
