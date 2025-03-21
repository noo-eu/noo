import { getTranslations } from "next-intl/server";
import { BirthdateForm } from "@/screens/profile/birthdate/BirthdateForm";
import { withAuth } from "@/auth/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("birthdate.title"),
    description: "",
  };
}

async function Page() {
  return <BirthdateForm />;
}

export default withAuth(Page);
