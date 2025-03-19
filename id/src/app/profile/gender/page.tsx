import { getTranslations } from "next-intl/server";
import { Form } from "./Form";
import { withAuth } from "@/lib/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("gender.title"),
    description: "",
  };
}

function ProfileGenderPage() {
  return <Form />;
}

export default withAuth(ProfileGenderPage);
