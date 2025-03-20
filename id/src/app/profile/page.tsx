import { getTranslations } from "next-intl/server";
import { withAuth } from "@/auth/withAuth";
import ProfileHub from "@/screens/profile/Hub";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t.rich("title", { noo: () => "noo" }),
    description: "",
  };
}

function Page() {
  return <ProfileHub />;
}

export default withAuth(Page);
