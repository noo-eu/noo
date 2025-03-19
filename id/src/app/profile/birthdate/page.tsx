import { getTranslations } from "next-intl/server";
import { Form } from "./Form";
import { withAuth } from "@/lib/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("birthdate.title"),
    description: "",
  };
}

function ProfileBirthdatePage() {
  return <Form />;
}

export default withAuth(ProfileBirthdatePage);
