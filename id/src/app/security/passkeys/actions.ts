"use server";

import { SessionsService } from "@/lib/SessionsService";
import { generateRegistrationOptions } from "@simplewebauthn/server";

const WebAuthnID =
  process.env.NODE_ENV === "production" ? "id.noo.eu" : "localhost";

export async function registrationOptions(uid: string) {
  if (!uid) {
    return { error: "Missing user ID" };
  }

  const user = await SessionsService.user(uid);
  if (!user) {
    return { error: "User not found" };
  }

  // // (Pseudocode) Retrieve any of the user's previously-
  // // registered authenticators
  // const userPasskeys: Passkey[] = getUserPasskeys(user);

  const encoder = new TextEncoder();
  const uint8UserId = encoder.encode(uid);

  const options: PublicKeyCredentialCreationOptionsJSON =
    await generateRegistrationOptions({
      rpName: "noo",
      rpID: WebAuthnID,
      userName: user.username,
      userID: uint8UserId,
      userDisplayName: `${user.firstName} ${user.lastName}`.trim(),
      timeout: 600000, // 10 minutes
      attestationType: "none",
      // Prevent users from re-registering existing authenticators
      // excludeCredentials: userPasskeys.map((passkey) => ({
      //   id: passkey.id,
      //   // Optional
      //   transports: passkey.transports,
      // })),
      excludeCredentials: [],
      // See "Guiding use of authenticators via authenticatorSelection" below
      authenticatorSelection: {
        residentKey: "discouraged",
        userVerification: "discouraged",
        authenticatorAttachment: "cross-platform",
      },
      preferredAuthenticatorType: "localDevice",
    });

  return options;
}
