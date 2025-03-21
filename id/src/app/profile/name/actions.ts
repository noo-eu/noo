import { BasicFormAction } from "@/lib/types/ActionResult";
import { getSessionUserById } from "@/auth/SessionsService";
import Users from "@/db/users";
import { validateNameForm } from "@/lib/validations/name";
import { redirect } from "next/navigation";
import { z } from "zod";

const updateNameSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

function cleanupName(name: string | undefined): string {
  return name?.trim().replaceAll(/\s+/g, " ") || "";
}

export async function updateName(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<BasicFormAction> {
  const user = await getSessionUserById(uid);
  if (!user) {
    return redirect("/");
  }

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
