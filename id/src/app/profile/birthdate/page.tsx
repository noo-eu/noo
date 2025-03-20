import { getTranslations } from "next-intl/server";
import { BirthdateForm } from "@/screens/profile/birthdate/BirthdateForm";
import { withAuth } from "@/auth/withAuth";
import { User } from "@/db/users";
import { makeUpdateBirthdateAction } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("birthdate.title"),
    description: "",
  };
}

async function Page({ user }: { user: User }) {
  return <BirthdateForm action={makeUpdateBirthdateAction(user.id)} />;
}

export default withAuth(Page);
