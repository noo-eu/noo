"use server";

import Users from "@/db/users";
import { checkPwnedPassword } from "@/lib/password";
import { SessionsService } from "@/lib/SessionsService";
import { hashPassword } from "@/lib/SignupService";
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
