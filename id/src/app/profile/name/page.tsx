import { getTranslations } from "next-intl/server";
import { NameForm } from "@/screens/profile/name/NameForm";
import { withAuth } from "@/auth/withAuth";
import { makeUpdateNameAction } from "./actions";
import { User } from "@/db/users";

export async function generateMetadata() {
  const t = await getTranslations("profile");

  return {
    title: t("name.title"),
    description: "",
  };
}

async function Page({ user }: { user: User }) {
  return <NameForm action={makeUpdateNameAction(user.id)} />;
}

export default withAuth(Page);
