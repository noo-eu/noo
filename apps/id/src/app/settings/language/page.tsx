import { withAuth } from "@/auth/withAuth";
import { LanguageForm } from "@/screens/settings/language/LanguageForm";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("settings");

  return {
    title: t("language.title"),
    description: "",
  };
}

async function Page() {
  return <LanguageForm />;
}

export default withAuth(Page);
