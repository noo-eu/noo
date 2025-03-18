"use server";

import Passkeys from "@/db/passkeys";
import Users from "@/db/users";
import { SessionsService } from "@/lib/SessionsService";
import {
  generateRegistrationOptions,
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { ActionResult } from "../actions";

const WebAuthnID =
  process.env.NODE_ENV === "production" ? "id.noo.eu" : "localhost";

export async function registrationOptions(
  uid: string,
): Promise<ActionResult<PublicKeyCredentialCreationOptionsJSON, string, null>> {
  if (!uid) {
    return { error: "Missing user ID", input: null };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    return { error: "User not found", input: null };
  }

  const userPasskeys = await Passkeys.listForUser(user.id);

  const encoder = new TextEncoder();
  const uint8UserId = encoder.encode(uid);
  const username = `${user.username}@${user.tenant?.domain || "noomail.eu"}`;

  const options = await generateRegistrationOptions({
    rpName: "noo",
    rpID: WebAuthnID,
    userName: username,
    userID: uint8UserId,
    userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
    timeout: 1200000, // 2 minutes
    attestationType: "direct",
    // Prevent users from re-registering existing authenticators
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "cross-platform",
    },
  });

  await Users.update(user.id, { webauthnChallenge: options.challenge });

  return { data: options, input: null };
}

export async function verifyRegistration(
  uid: string,
  registrationResponse: RegistrationResponseJSON,
) {
  if (!uid) {
    return { error: "Missing user ID" };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    return { error: "User not found" };
  }

  const challenge = user.webauthnChallenge;
  if (!challenge) {
    return { error: "Missing challenge" };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: challenge,
      expectedOrigin: `https://${WebAuthnID}:13000`,
      expectedRPID: WebAuthnID,
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return { error: "Error verifying registration" };
  }

  if (verification.verified) {
    const info = verification.registrationInfo!;
    console.log(info);
    const credential = info.credential;

    await Passkeys.create({
      userId: user.id,
      name: "",
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

  return verification;
}
