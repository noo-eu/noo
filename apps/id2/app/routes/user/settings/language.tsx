import { redirect, type ActionFunctionArgs } from "react-router";
import { emptyAuthLoader } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import Users from "~/db/users.server";
import type { BasicFormAction } from "~/lib/types/ActionResult";
import { LanguageForm } from "~/screens/settings/language/LanguageForm";

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
