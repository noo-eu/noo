import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { emptyAuthLoader } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import Users from "~/db/users.server";
import type { BasicFormAction } from "~/lib/types/ActionResult";
import { validateNameForm } from "~/lib/validations/name";
import { NameForm } from "~/screens/profile/name/NameForm";

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
