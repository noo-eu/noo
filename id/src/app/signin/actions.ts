"use server";

import {
  createSession,
  getAuthenticatedSession,
  reauthenticateSession,
} from "@/auth/sessions";
import { schema } from "@/db";
import Passkeys from "@/db/passkeys";
import Tenants from "@/db/tenants";
import Users, { User } from "@/db/users";
import { getIpAddress, getUserAgent } from "@/lib/http/nextUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { checkPwnedPassword } from "@/lib/password";
import { ActionResult, BasicFormAction } from "@/lib/types/ActionResult";
import { humanIdToUuid, uuidToHumanId } from "@/utils";
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWebAuthnID } from "../security/passkeys/actions";
import PasskeyChallenges from "@/db/passkeyChallenges";
import { getSigningKey, getVerifyingKeyForJwt } from "@/lib/jwks";

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

  const { username, password } = parseResult.data;

  const user = await Users.authenticate(username.trim(), password.trim());
  if (!user) {
    // Artificially slow down the response to slow down brute force attacks.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { error: "credentials", input: { username } };
  }

  await maybeCheckPwnedPassword(user, password);

  if (user.otpSecret) {
    await startTotpSession(user);
    redirect("/signin/otp");

    // Safety net, should never happen
    throw new Error("Redirected to OTP page");
  }

  const result = await handleSuccessfulAuthentication<{ username: string }>(
    user,
    {
      username,
    },
  );

  if (result.data) {
    redirect(result.data);
  }

  return result;
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

export async function generateWebauthnOptions() {
  const options: PublicKeyCredentialRequestOptionsJSON =
    await generateAuthenticationOptions({
      rpID: await getWebAuthnID(),
      userVerification: "required",
    });

  const passkeyChallenge = await PasskeyChallenges.create({
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + 1000 * 60 * 5),
  });

  return { options, passkeyChallengeId: passkeyChallenge.id };
}

async function getWebAuthnExpectedOrigin() {
  if (process.env.NODE_ENV === "production") {
    return "https://id.noo.eu";
  }

  const hdrs = await headers();
  const scheme = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("host") ?? "localhost";
  return `${scheme}://${host}`;
}

export async function verifyWebauthn(
  passkeyChallengeId: string,
  response: AuthenticationResponseJSON,
): Promise<ActionResult<string, string, { domain?: string }>> {
  const passkeyId = response.id;

  const passkey = await Passkeys.findBy(
    eq(schema.passkeys.credentialId, passkeyId),
  );
  if (!passkey) {
    return { error: "Passkey not found", input: {} };
  }

  const passkeyChallenge = await PasskeyChallenges.find(passkeyChallengeId);
  if (!passkeyChallenge) {
    return { error: "Passkey challenge not found", input: {} };
  }

  await PasskeyChallenges.destroy(passkeyChallengeId);

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: passkeyChallenge.challenge,
      expectedOrigin: await getWebAuthnExpectedOrigin(),
      expectedRPID: await getWebAuthnID(),
      credential: {
        id: passkey.id,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch (error) {
    console.error(error);
    return { error: `WebAuthn verification failed: ${error}`, input: {} };
  }

  const { verified } = verification;
  if (!verified) {
    return { error: "Passkey verification failed", input: {} };
  }

  const { authenticationInfo } = verification;
  const { newCounter } = authenticationInfo;

  await Passkeys.update(passkey.id, {
    counter: newCounter,
    lastUsedAt: new Date(),
  });

  return await handleSuccessfulAuthentication(passkey.user, {});
}

async function handleSuccessfulAuthentication<Input>(
  user: User,
  input: Input,
): Promise<ActionResult<string, string, Input & { domain?: string }>> {
  const oidcAuthorizationRequest = await getOidcAuthorizationRequest();
  if (oidcAuthorizationRequest?.tenantId) {
    if (user.tenantId !== oidcAuthorizationRequest.tenantId) {
      const tenant = await Tenants.find(oidcAuthorizationRequest.tenantId);

      return {
        error: "tenant",
        input: { ...input, domain: tenant!.domain },
      };
    }
  }

  await startSession(user);

  if (!oidcAuthorizationRequest) {
    return { data: "/", input: { ...input, domain: undefined } };
  } else {
    const uid = uuidToHumanId(user.id, "usr");
    return {
      data: `/oidc/consent?uid=${uid}`,
      input: { ...input, domain: undefined },
    };
  }
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
