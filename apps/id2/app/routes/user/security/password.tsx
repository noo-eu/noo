import { and, eq, not } from "drizzle-orm";
import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { emptyAuthLoader } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import { getAuthenticatedSession } from "~/auth/sessions.server";
import { schema } from "~/db";
import Sessions from "~/db/sessions";
import Users from "~/db/users.server";
import { hashPassword } from "~/lib/SignupService";
import type { BasicFormAction } from "~/lib/types/ActionResult";
import { PasswordForm } from "~/screens/security/password/PasswordForm";

export const loader = emptyAuthLoader;

export default function Page() {
  return <PasswordForm />;
}

const updatePasswordSchema = z.object({
  "new-password": z.string(),
  "new-password-confirmation": z.string(),
});

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<BasicFormAction> {
  const user = context.get(userContext);
  if (!user) {
    throw redirect("/signin");
  }

  const form = await request.formData();
  const data = updatePasswordSchema.parse(Object.fromEntries(form));

  if (data["new-password"].length < 10) {
    return {
      input: data,
      error: { "new-password": "short" },
    };
  }

  if (data["new-password"].length > 200) {
    return {
      input: data,
      error: { "new-password": "long" },
    };
  }

  if (data["new-password"] !== data["new-password-confirmation"]) {
    return {
      input: data,
      error: { "new-password-confirmation": "mismatch" },
    };
  }

  const digest = await hashPassword(data["new-password"]);
  await Users.update(user.id, {
    passwordDigest: digest,
    passwordChangedAt: new Date(),
    passwordBreaches: 0,
    passwordBreachesCheckedAt: undefined,
  });

  const currentSession = (await getAuthenticatedSession(request, user.id))!;
  // Terminate all other sessions
  await Sessions.destroyBy(
    and(
      not(eq(schema.sessions.id, currentSession.id)),
      eq(schema.sessions.userId, user.id),
    )!,
  );

  return { input: data };
}

async function terminateAllSessions(uid: string, except: string) {}
