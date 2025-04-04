import { getTranslations } from "next-intl/server";
import { NameForm } from "@/screens/profile/name/NameForm";
import { withAuth } from "@/auth/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("name.title"),
    description: "",
  };
}

async function Page() {
  return <NameForm />;
}

export default withAuth(Page);
