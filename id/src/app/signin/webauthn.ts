"use server";

import { schema } from "@/db";
import PasskeyChallenges from "@/db/passkeyChallenges";
import Passkeys from "@/db/passkeys";
import { ActionResult } from "@/lib/types/ActionResult";
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getWebAuthnID } from "../security/passkeys/actions";
import { handleSuccessfulAuthentication } from "./actions";

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
