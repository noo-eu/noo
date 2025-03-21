import { withAuth } from "@/auth/withAuth";
import { getTranslations } from "next-intl/server";
import { PasswordForm } from "@/screens/security/password/PasswordForm";

export async function generateMetadata() {
  const t = await getTranslations("security");

  return {
    title: t("password.title"),
    description: "",
  };
}

function Page() {
  return <PasswordForm />;
}

export default withAuth(Page);
