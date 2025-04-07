import { redirect, type ActionFunctionArgs } from "react-router";
import { emptyAuthLoader } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import Users from "~/db.server/users.server";
import { LanguageForm } from "~/screens/settings/language/LanguageForm";
import type { BasicFormAction } from "~/types/ActionResult";

export const loader = emptyAuthLoader;

export default function LanguagePage() {
  return <LanguageForm />;
}

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<BasicFormAction> {
  const user = context.get(userContext);
  if (!user) {
    throw redirect("/");
  }

  const form = await request.formData();

  const language = form.get("language") as string;
  await Users.update(user.id, { locale: language });

  return { input: { language } };
}
