import { withAuth } from "@/auth/withAuth";
import { SettingsHub } from "@/screens/settings/Hub";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("settings");

  return {
    title: t.rich("title", { noo: () => "noo" }),
    description: "",
  };
}

async function Page() {
  return <SettingsHub />;
}

export default withAuth(Page);
