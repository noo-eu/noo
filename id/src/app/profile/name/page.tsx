import { getTranslations } from "next-intl/server";
import { Form } from "./Form";
import { withAuth } from "@/lib/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("name.title"),
    description: "",
  };
}

function ProfileNamePage() {
  return <Form />;
}

export default withAuth(ProfileNamePage);
