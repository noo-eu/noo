"use server";

import {
  createSession,
  getAuthenticatedSession,
  reauthenticateSession,
} from "@/auth/sessions";
import Tenants from "@/db/tenants";
import Users, { User } from "@/db/users";
import { getIpAddress, getUserAgent } from "@/lib/http/nextUtils";
import { getSigningKey, getVerifyingKeyForJwt } from "@/lib/jwks";
import "@/lib/oidc/setup";
import { getOidcAuthorizationClient } from "@/lib/oidc/utils";
import { checkPwnedPassword } from "@/lib/password";
import { ActionResult, BasicFormAction } from "@/lib/types/ActionResult";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function signin(
  _: unknown,
  formData: FormData,
): Promise<
  ActionResult<undefined, string, { username: string; domain?: string }>
> {
  if (formData.get("captcha")) {
    // This is a bot, don't even bother
    return { error: "validation", input: { username: "" } };
  }

  const parseResult = signinSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parseResult.success) {
    return { error: "validation", input: { username: "" } };
  }

  const oidcAuthorizationClient = await getOidcAuthorizationClient();

  const { username, password } = parseResult.data;

  const user = await Users.authenticate(
    username.trim(),
    password.trim(),
    oidcAuthorizationClient,
  );
  if (!user) {
    return { error: "credentials", input: { username } };
  }

  await maybeCheckPwnedPassword(user, password);

  if (user.otpSecret) {
    await startTotpSession(user);
    redirect("/signin/otp");
  } else {
    const result = await handleSuccessfulAuthentication<{ username: string }>(
      user,
      { username },
    );

    if (result.data) {
      redirect(result.data);
    }

    return result;
  }
}

export async function totpSubmit(
  _: unknown,
  formData: FormData,
): Promise<BasicFormAction> {
  const totpUserId = await loadTotpSession();
  if (!totpUserId) {
    redirect("/signin");
  }

  const user = await Users.find(humanIdToUuid(totpUserId, "usr")!);
  if (!user) {
    redirect("/signin");
  }

  const totpCode = formData.get("totp") as string;
  if (!totpCode) {
    return { error: { totp: "credentials" }, input: {} };
  }

  if (!(await Users.verifyTotp(user, totpCode))) {
    return { error: { totp: "credentials" }, input: {} };
  }

  // Clear the TOTP session
  const cookieStore = await cookies();
  await cookieStore.set(TOTP_COOKIE, "", { maxAge: 0 });

  const result = await handleSuccessfulAuthentication(user, {});
  if (result.data) {
    redirect(result.data);
  }

  return { error: { tenant: result.error! }, input: {} };
}

async function startSession(user: User) {
  const ip = await getIpAddress();
  const ua = await getUserAgent();

  let session = await getAuthenticatedSession(user.id);
  if (session) {
    // Update the lastAuthenticatedAt timestamp, which is used for the OIDC auth_time claim
    await reauthenticateSession(session.id, ip, ua);
  } else {
    session = await createSession(user.id, ip, ua);
  }

  return session;
}

const PASSWORD_BREACH_CHECK_INTERVAL = 1000 * 60 * 60 * 24 * 7; // 1 week

async function maybeCheckPwnedPassword(
  user: User,
  password: string,
  interval: number = PASSWORD_BREACH_CHECK_INTERVAL,
) {
  if (
    !user.passwordBreachesCheckedAt ||
    user.passwordBreachesCheckedAt < new Date(Date.now() - interval)
  ) {
    if (user.passwordBreaches > 0) {
      // No need to check again, we know the password is breached
      await Users.update(user.id, { passwordBreachesCheckedAt: new Date() });
    } else {
      const breaches = await checkPwnedPassword(password);
      if (breaches.isOk() && breaches.value > 0) {
        await Users.update(user.id, {
          passwordBreaches: breaches.value,
          passwordBreachesCheckedAt: new Date(),
        });
      }
    }
  }
}

export async function handleSuccessfulAuthentication<Input>(
  user: User,
  input: Input,
): Promise<ActionResult<string, string, Input & { domain?: string }>> {
  const oidcAuthorizationClient = await getOidcAuthorizationClient();
  if (oidcAuthorizationClient) {
    if (oidcAuthorizationClient.tenantId) {
      // The user must be in the same tenant as the client
      if (user.tenantId !== oidcAuthorizationClient.tenantId) {
        const tenant = await Tenants.find(oidcAuthorizationClient.tenantId);
        return {
          error: "tenant",
          input: { ...input, domain: tenant!.domain },
        };
      }
    } else {
      // For the future: the client is public, if the user is in a tenant, we
      // need to make sure that the tenant allows public clients.
    }
  }

  await startSession(user);

  if (!oidcAuthorizationClient) {
    return { data: "/", input: { ...input, domain: undefined } };
  }

  const uid = uuidToHumanId(user.id, "usr");
  return {
    data: `/oidc/consent?uid=${uid}`,
    input: { ...input, domain: undefined },
  };
}

const TOTP_COOKIE = "_noo_short_lived";

async function startTotpSession(user: User, passedMethods: string[] = ["pwd"]) {
  // A totp session is a short lived, partially authenticated session
  // that can only be used to submit a TOTP code.

  // This works off a separate session cookie, so that the main session
  // is not affected by the TOTP flow.

  const { key, kid } = (await getSigningKey("EdDSA"))!;
  const token = await new SignJWT({ amr: passedMethods })
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setSubject(uuidToHumanId(user.id, "usr"))
    .setAudience("totp")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);

  const cookieStore = await cookies();
  await cookieStore.set(TOTP_COOKIE, token, {
    maxAge: 60 * 15,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
}

export async function loadTotpSession(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const token = await cookieStore.get(TOTP_COOKIE);
  if (!token) {
    return;
  }

  try {
    const jwt = await jwtVerify(token.value, getVerifyingKeyForJwt, {
      audience: "totp",
    });

    return jwt.payload.sub;
  } catch {}
}
