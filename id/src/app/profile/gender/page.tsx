import { SessionsService } from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { getTranslations } from "next-intl/server";
import { Form } from "./Form";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("gender.title"),
    description: "",
  };
}

export default async function ProfileGenderPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const uid = (await searchParams).uid;
  const dbUser = await SessionsService.user(uid);
  if (!dbUser) {
    return undefined;
  }

  const user = {
    id: uuidToHumanId(dbUser.id, "usr"),
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    birthdate: dbUser.birthdate,
    gender: dbUser.gender,
    genderCustom: dbUser.genderCustom,
    pronouns: dbUser.pronouns,
    picture: dbUser.picture,
  };

  return <Form user={user} />;
}
