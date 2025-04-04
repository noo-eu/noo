import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { emptyAuthLoader } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import Users from "~/db.server/users.server";
import { TimeZoneForm } from "~/screens/settings/time-zone/TimeZoneForm";
import type { BasicFormAction } from "~/types/ActionResult";

export const loader = emptyAuthLoader;

export default function TimeZonePage() {
  return <TimeZoneForm />;
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

  const timeZone = form.get("timeZone") as string;
  await Users.update(user.id, { timeZone });

  return { input: { timeZone } };
}
