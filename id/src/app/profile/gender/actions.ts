import { BasicFormAction } from "@/lib/types/ActionResult";
import { getSessionUserById } from "@/auth/SessionsService";
import Users from "@/db/users";
import { redirect } from "next/navigation";
import { z } from "zod";

const updateGenderSchema = z.object({
  gender: z.enum(["male", "female", "custom", "not_specified"]),
  genderCustom: z.string().optional(),
  pronouns: z.enum(["male", "female", "other"]).optional(),
});

export async function updateGender(
  uid: string,
  form: FormData,
): Promise<BasicFormAction> {
  const user = await getSessionUserById(uid);
  if (!user) {
    return redirect("/");
  }

  const data = updateGenderSchema.parse(Object.fromEntries(form));
  if (data.gender == "male" || data.gender == "female") {
    await Users.update(user.id, {
      gender: data.gender,
      genderCustom: null,
      pronouns: data.gender,
    });
  } else if (data.gender == "custom") {
    await Users.update(user.id, {
      gender: "custom",
      genderCustom: data.genderCustom,
      pronouns: data.pronouns || "other",
    });
  } else {
    await Users.update(user.id, {
      gender: "not_specified",
      genderCustom: null,
      pronouns: "other",
    });
  }

  return { input: data };
}

export function makeUpdateGenderAction(uid: string) {
  return async (_: unknown, data: FormData) => {
    "use server";
    return updateGender(uid, data);
  };
}
