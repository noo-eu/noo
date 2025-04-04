"use server";

import { getAuthenticatedUser } from "@/auth/sessions";
import Users from "@/db/users";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { redirect } from "next/navigation";

export async function updateTimeZone(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<BasicFormAction> {
  const user = await getAuthenticatedUser(uid);
  if (!user) {
    return redirect("/");
  }

  const timeZone = form.get("timeZone") as string;
  await Users.update(user.id, { timeZone });

  return { input: { timeZone } };
}
