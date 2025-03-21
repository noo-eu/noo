"use server";

import Passkeys from "@/db/passkeys";
import Users from "@/db/users";
import { SessionsService } from "@/auth/SessionsService";
import { humanIdToUuid } from "@/utils";
import {
  generateRegistrationOptions,
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { headers } from "next/headers";
import knownAuthenticators from "./knownAuthenticators";
import { ActionResult } from "@/lib/types/ActionResult";

async function getWebAuthnID() {
  if (process.env.NODE_ENV === "production") {
    return "id.noo.eu";
  }

  const hdrs = await headers();
  return hdrs.get("host")?.replace(/:\d+$/, "") || "localhost";
}

async function getWebAuthnExpectedOrigin() {
  if (process.env.NODE_ENV === "production") {
    return "https://id.noo.eu";
  }

  const hdrs = await headers();
  const scheme = hdrs.get("x-forwarded-proto") || "http";
  const host = hdrs.get("host") || "localhost";
  return `${scheme}://${host}`;
}

export async function registrationOptions(
  uid: string,
): Promise<ActionResult<PublicKeyCredentialCreationOptionsJSON, string>> {
  if (!uid) {
    return { error: "Missing user ID" };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    return { error: "User not found" };
  }

  const userPasskeys = await Passkeys.listForUser(user.id);

  const encoder = new TextEncoder();
  const uint8UserId = encoder.encode(uid);
  const username = `${user.username}@${user.tenant?.domain || "noomail.eu"}`;

  const options = await generateRegistrationOptions({
    rpName: "noo",
    rpID: await getWebAuthnID(),
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
    },
  });

  await Users.update(user.id, { webauthnChallenge: options.challenge });

  return { data: options };
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
      expectedOrigin: await getWebAuthnExpectedOrigin(),
      expectedRPID: await getWebAuthnID(),
    });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return { error: "Error verifying registration" };
  }

  if (verification.verified) {
    const info = verification.registrationInfo!;
    const credential = info.credential;
    const authenticatorName = knownAuthenticators[info.aaguid] || "";

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

  return verification;
}

export async function removePasskey(
  uid: string,
  humanPasskeyId: string,
): Promise<ActionResult<null, string>> {
  if (!uid) {
    return { error: "Missing user ID" };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    return { error: "User not found" };
  }

  const passkeyId = humanIdToUuid(humanPasskeyId, "idpsk")!;
  await Passkeys.destroy(user.id, passkeyId);

  return { data: null };
}

export async function changePasskeyName(
  uid: string,
  humanPasskeyId: string,
  _: unknown,
  form: FormData,
): Promise<ActionResult<null, string, { name: string }>> {
  const name = form.get("name") as string;

  if (!uid) {
    console.error("Missing user ID");
    return { error: "Missing user ID", input: { name } };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    console.error("User not found");
    return { error: "User not found", input: { name } };
  }

  const passkeyId = humanIdToUuid(humanPasskeyId, "idpsk")!;
  await Passkeys.update(passkeyId, { name });

  return { data: null, input: { name } };
}
