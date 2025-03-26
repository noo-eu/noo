import { getTranslations } from "next-intl/server";
import { TotpScreen } from "@/screens/signin/totp/TotpScreen";

export async function generateMetadata() {
  const t = await getTranslations("signin");

  return {
    title: t("metaTitle"),
    description: "",
  };
}

export default async function Page() {
  return <TotpScreen />;
}
