import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";
import { handleSuccessfulAuthentication } from "~/auth.server/success";
import { schema } from "~/db.server";
import PasskeyChallenges from "~/db.server/passkeyChallenges";
import Passkeys from "~/db.server/passkeys";
import type { ActionResult } from "~/types/ActionResult";
import { getWebAuthnExpectedOrigin, getWebAuthnID } from "./start";

export async function action({
  request,
}: ActionFunctionArgs): Promise<
  ActionResult<string, string, { domain?: string }>
> {
  const data = await request.json();
  const passkeyChallengeId: string = data.passkeyChallengeId;
  const response: AuthenticationResponseJSON = data.authResponse;

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
