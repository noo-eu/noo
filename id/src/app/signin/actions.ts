"use server";

import { redirect } from "next/navigation";
import {
  getSessionCookie,
  SessionsService,
  setSessionCookie,
} from "@/lib/SessionsService";
import { getIpAddress, getUserAgent } from "@/utils";
import { z } from "zod";
import Users from "@/db/users";

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
  continue: z.string().optional(),
});

export async function signin(_: unknown, formData: FormData) {
  const { username, password, ...params } = signinSchema.parse(
    Object.fromEntries(formData.entries()),
  );

  const user = await Users.authenticate(username.trim(), password.trim());
  if (!user) {
    return { username, error: 1 };
  }

  if (user.otpSecret) {
    // TODO: create a 5 minute token and redirect to /otp?token=...
    throw new Error("OTP step not implemented");
  }

  const cookie = await getSessionCookie();
  const svc = new SessionsService(cookie);

  let session = await svc.sessionFor(user);
  if (session) {
    // Update the lastAuthenticatedAt timestamp, which is used for the OIDC auth_time claim
    await svc.reauthenticate(
      session.id,
      await getIpAddress(),
      await getUserAgent(),
    );
  } else {
    session = await svc.startSession(
      user.id,
      await getIpAddress(),
      await getUserAgent(),
    );

    await setSessionCookie(svc.buildCookie());
  }

  let continueUrl = params.continue;
  if (!continueUrl || !continueUrl.startsWith("/")) {
    continueUrl = "/";
  }

  continueUrl = continueUrl.replace("__sid__", session.id);

  redirect(continueUrl);
}
