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
import { ActionResult } from "@/lib/types/ActionResult";
import { uuidToHumanId } from "@/utils";
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getKeyByAlg } from "../oidc/jwks";
import { getWebAuthnID } from "../security/passkeys/actions";

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

  const oidcAuthorizationRequest = await getOidcAuthorizationRequest();
  if (oidcAuthorizationRequest?.tenantId) {
    if (user.tenantId !== oidcAuthorizationRequest.tenantId) {
      const tenant = await Tenants.find(oidcAuthorizationRequest.tenantId);

      return {
        error: "tenant",
        input: { username, domain: tenant!.domain },
      };
    }
  }

  if (user.otpSecret) {
    await startTotpSession(user);
    redirect("/signin/otp");

    // Safety net, should never happen
    throw new Error("Redirected to OTP page");
  }

  await startSession(user);
  const uid = uuidToHumanId(user.id, "usr");

  if (!oidcAuthorizationRequest) {
    redirect("/");
  } else {
    redirect(`/oidc/consent?uid=${uid}`);
  }
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

const TOTP_COOKIE = "_noo_short_lived";

async function startTotpSession(user: User, passedMethods: string[] = ["pwd"]) {
  // A totp session is a short lived, partially authenticated session
  // that can only be used to submit a TOTP code.

  // This works off a separate session cookie, so that the main session
  // is not affected by the TOTP flow.

  const { key, kid } = (await getKeyByAlg("EdDSA"))!;
  const token = await new SignJWT({ amr: passedMethods })
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setSubject(user.id)
    .setAudience("totp")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);

  const cookieStore = await cookies();
  await cookieStore.set(TOTP_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 400,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
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
      challenge: "123",
    });

  // (Pseudocode) Remember this challenge for this user
  // setCurrentAuthenticationOptions(user, options);

  return options;
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
  response: AuthenticationResponseJSON,
): Promise<ActionResult<undefined, string, { domain?: string }>> {
  const passkeyId = response.id;

  const passkey = await Passkeys.findBy(
    eq(schema.passkeys.credentialId, passkeyId),
  );
  console.log("passkey", passkey, "passkeyId", passkeyId);
  if (!passkey) {
    return { error: "Passkey not found", input: {} };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: "MTIz",
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
  if (verified) {
    const { authenticationInfo } = verification;
    const { newCounter } = authenticationInfo;

    await Passkeys.update(passkey.id, {
      counter: newCounter,
      lastUsedAt: new Date(),
    });

    const user = passkey.user;

    const oidcAuthorizationRequest = await getOidcAuthorizationRequest();
    if (oidcAuthorizationRequest?.tenantId) {
      if (user.tenantId !== oidcAuthorizationRequest.tenantId) {
        const tenant = await Tenants.find(oidcAuthorizationRequest.tenantId);

        const fullUsername =
          user.username + "@" + (tenant?.domain ?? "noomail.eu");

        return {
          error: "tenant",
          input: { domain: tenant!.domain },
        };
      }
    }

    await startSession(passkey.user);

    if (!oidcAuthorizationRequest) {
      redirect("/");
    } else {
      const uid = uuidToHumanId(user.id, "usr");
      redirect(`/oidc/consent?uid=${uid}`);
    }
  } else {
    return { error: "Passkey verification failed", input: {} };
  }
}
