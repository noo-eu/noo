import { getTranslations } from "next-intl/server";
import ProfilePage from "./ProfileHomePage";
import { withAuth } from "@/lib/withAuth";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t.rich("title", { noo: () => "noo" }),
    description: "",
  };
}

function ProfileHome() {
  return <ProfilePage />;
}

export default withAuth(ProfileHome);
