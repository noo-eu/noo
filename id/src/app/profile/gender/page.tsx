import { getTranslations } from "next-intl/server";
import { GenderForm } from "@/screens/profile/gender/GenderForm";
import { withAuth } from "@/auth/withAuth";
import { User } from "@/db/users";
import { makeUpdateGenderAction } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("gender.title"),
    description: "",
  };
}

async function Page({ user }: { user: User }) {
  return <GenderForm action={makeUpdateGenderAction(user.id)} />;
}

export default withAuth(Page);
