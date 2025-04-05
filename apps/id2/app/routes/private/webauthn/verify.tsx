import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { handleSuccessfulAuthentication } from "~/auth/success";
import { schema } from "~/db";
import PasskeyChallenges from "~/db/passkeyChallenges";
import Passkeys from "~/db/passkeys";
import type { ActionResult } from "~/lib/types/ActionResult";
import { getWebAuthnExpectedOrigin, getWebAuthnID } from "./start";

export async function loader(
  request: Request,
): Promise<ActionResult<string, string, { domain?: string }>> {
  const data = await request.json();
  const passkeyChallengeId: string = data.passkeyChallengeId;
  const response: AuthenticationResponseJSON = data.response;

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
      expectedOrigin: await getWebAuthnExpectedOrigin(request),
      expectedRPID: await getWebAuthnID(request),
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

  return await handleSuccessfulAuthentication(request, passkey.user, {});
}
