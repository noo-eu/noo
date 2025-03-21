import { getTranslations } from "next-intl/server";
import { GenderForm } from "@/screens/profile/gender/GenderForm";
import { withAuth } from "@/auth/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("gender.title"),
    description: "",
  };
}

async function Page() {
  return <GenderForm />;
}

export default withAuth(Page);
