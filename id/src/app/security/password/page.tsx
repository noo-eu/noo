import { withAuth } from "@/lib/withAuth";
import { getTranslations } from "next-intl/server";
import { Form } from "./Form";

export async function generateMetadata() {
  const t = await getTranslations("security");

  return {
    title: t("password.title"),
    description: "",
  };
}

function SecurityPasswordPage() {
  return <Form />;
}

export default withAuth(SecurityPasswordPage);
