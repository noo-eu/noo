import type { ActionFunctionArgs } from "react-router";
import { checkPwnedPassword } from "~/auth.server/hibp";

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();
  const password = data.password;

  const result = await checkPwnedPassword(password);
  if (result.isErr()) {
    // Fail silently
    return { breaches: 0 };
  } else {
    return { breaches: result.value };
  }
}
