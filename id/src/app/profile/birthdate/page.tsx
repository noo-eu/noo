import { SessionsService } from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { getTranslations } from "next-intl/server";
import { Form } from "./Form";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("birthdate.title"),
    description: "",
  };
}

export default async function ProfileBirthdatePage({
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
    picture: dbUser.picture,
  };

  return <Form user={user} />;
}
