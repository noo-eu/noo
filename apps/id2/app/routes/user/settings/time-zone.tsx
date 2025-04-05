import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { emptyAuthLoader } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import Users from "~/db/users.server";
import type { BasicFormAction } from "~/lib/types/ActionResult";
import { TimeZoneForm } from "~/screens/settings/time-zone/TimeZoneForm";

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
