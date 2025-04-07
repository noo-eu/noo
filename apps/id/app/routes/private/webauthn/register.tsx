import {
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
} from "@simplewebauthn/server";
import type { ActionFunctionArgs } from "react-router";
import { userContext } from "~/auth.server/serverContext";
import Passkeys from "~/db.server/passkeys";
import type { ActionResult } from "~/types/ActionResult";
import knownAuthenticators from "./knownAuthenticators";
import { getWebAuthnExpectedOrigin, getWebAuthnID } from "./start";

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<
  ActionResult<VerifiedRegistrationResponse, string>
> {
  const user = context.get(userContext);
  if (!user) {
    return { error: "User not found" };
  }

  const challenge = user.webauthnChallenge;
  if (!challenge) {
    return { error: "Missing challenge" };
  }

  const data = await request.json();
  const registrationResponse = data.registrationResponse;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challenge,
      expectedOrigin: await getWebAuthnExpectedOrigin(request),
      expectedRPID: await getWebAuthnID(request),
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return { error: "Error verifying registration" };
  }

  if (verification.verified) {
    const info = verification.registrationInfo!;
    const credential = info.credential;
    const authenticatorName = knownAuthenticators[info.aaguid] ?? "";

    await Passkeys.create({
      userId: user.id,
      name: authenticatorName,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      transports: credential.transports,
    });
  } else {
    console.error("Registration could not be verified");
    return { error: "Error verifying registration" };
  }

  return { data: verification };
}
