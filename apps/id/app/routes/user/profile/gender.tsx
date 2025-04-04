import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { emptyAuthLoader } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import Users from "~/db.server/users.server";
import { GenderForm } from "~/screens/profile/gender/GenderForm";
import type { BasicFormAction } from "~/types/ActionResult";

export const loader = emptyAuthLoader;

export default function GenderFormPage() {
  return <GenderForm />;
}

const updateGenderSchema = z.object({
  gender: z.enum(["male", "female", "custom", "not_specified"]),
  genderCustom: z.string().optional(),
  pronouns: z.enum(["male", "female", "other"]).optional(),
});

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<BasicFormAction> {
  const user = context.get(userContext);
  if (!user) {
    throw redirect("/");
  }

  const form = await request.formData();

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
      pronouns: data.pronouns ?? "other",
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
