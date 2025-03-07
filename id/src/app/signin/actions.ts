"use server";

import Tenants from "@/db/tenants";
import Users from "@/db/users";
import { getIpAddress, getUserAgent } from "@/lib/http/nextUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import {
  getSessionCookie,
  SessionsService,
  setSessionCookie,
} from "@/lib/SessionsService";
import { redirect } from "next/navigation";
import { z } from "zod";

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
    return { username, error: "credentials" };
  }

  const oidcAuthorizationRequest = await getOidcAuthorizationRequest();
  if (oidcAuthorizationRequest?.tenantId) {
    if (user.tenantId !== oidcAuthorizationRequest.tenantId) {
      const tenant = await Tenants.find(oidcAuthorizationRequest.tenantId);

      return {
        username,
        error: "tenant",
        domain: tenant!.domain,
      };
    }
  }

  if (user.otpSecret) {
    // TODO: create a 5 minute token and redirect to /otp?token=...
    throw new Error("OTP step not implemented");
  }

  const svc = new SessionsService(await getSessionCookie());

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

  if (!oidcAuthorizationRequest) {
    let continueUrl = params.continue;
    if (!continueUrl || !continueUrl.startsWith("/")) {
      continueUrl = "/";
    }

    continueUrl = continueUrl.replace("__sid__", session.id);

    redirect(continueUrl);
  } else {
    redirect(`/oidc/consent?sid=${session.id}`);
  }
}
