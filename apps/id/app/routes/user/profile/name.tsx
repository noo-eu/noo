import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { emptyAuthLoader } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import Users from "~/db.server/users.server";
import { validateNameForm } from "~/lib.server/validations/name";
import { NameForm } from "~/screens/profile/name/NameForm";
import type { BasicFormAction } from "~/types/ActionResult";

export const loader = emptyAuthLoader;

export default function Home() {
  return <NameForm />;
}

const updateNameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

function cleanupName(name: string | undefined): string {
  return name?.trim().replaceAll(/\s+/g, " ") ?? "";
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

  const data = updateNameSchema.parse(Object.fromEntries(form));
  const firstName = cleanupName(data.firstName);
  const lastName = cleanupName(data.lastName);

  const validationResult = validateNameForm(firstName, lastName);
  if (validationResult) {
    return { input: data, error: validationResult };
  }

  await Users.update(user.id, { firstName, lastName });

  return { input: data };
}
