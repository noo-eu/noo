import { getTranslations } from "next-intl/server";
import { SignInScreen } from "@/screens/signin/SignInScreen";

export async function generateMetadata() {
  const t = await getTranslations("signin");

  return {
    title: t("metaTitle"),
    description: "",
  };
}

export default async function Page() {
  return <SignInScreen />;
}
