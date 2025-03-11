"use server";

import { sessions } from "@/db/schema";
import Sessions from "@/db/sessions";
import Users from "@/db/users";
import { checkPwnedPassword } from "@/lib/password";
import { SessionsService } from "@/lib/SessionsService";
import { hashPassword } from "@/lib/SignupService";
import { humanIdToUuid } from "@/utils";
import { and, eq, not } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

const updatePasswordSchema = z.object({
  "new-password": z.string(),
  "new-password-confirmation": z.string(),
});

type ErrorType = { [key: string]: string | undefined };

export type ActionResult<T, E, I> = { input: I } & (
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: E;
    }
);

export async function updatePassword(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<
  ActionResult<
    { success: boolean },
    ErrorType,
    z.infer<typeof updatePasswordSchema>
  >
> {
  const user = await SessionsService.userFor(uid);
  if (!user) {
    return redirect("/signin");
  }

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

  const currentSession = await SessionsService.sessionFor(uid);
  await terminateAllSessions(uid, currentSession!.id);

  return { data: { success: true }, input: data };
}

export async function checkBreaches(password: string) {
  const result = await checkPwnedPassword(password);
  if (result.isErr()) {
    // Fail silently
    return { breaches: 0 };
  } else {
    return { breaches: result.value };
  }
}

async function terminateAllSessions(uid: string, except: string) {
  const userId = humanIdToUuid(uid, "usr")!;

  await Sessions.destroyBy(
    and(not(eq(sessions.id, except)), eq(sessions.userId, userId))!,
  );
}

export async function terminateSession(uid: string, sid: string) {
  await Sessions.destroy(sid);

  return redirect(`/security/sessions?uid=${uid}`);
}
