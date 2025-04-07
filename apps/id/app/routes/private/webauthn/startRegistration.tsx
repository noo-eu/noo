import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { ActionFunctionArgs } from "react-router";
import { userContext } from "~/auth.server/serverContext";
import Passkeys from "~/db.server/passkeys";
import Users, { type UserWithTenant } from "~/db.server/users.server";
import type { ActionResult } from "~/types/ActionResult";
import { getWebAuthnID } from "./start";

export function getUserEmail(user: UserWithTenant) {
  if (user.tenant) {
    if (user.tenant.domain) {
      return `${user.username}@${user.tenant.domain}`;
    }
    return undefined;
  }

  return `${user.username}@${process.env.NONSECRET_PUBLIC_MAIL_DOMAIN}`;
}

export function buildUsername(user: UserWithTenant) {
  return getUserEmail(user) ?? `${user.username} @ ${user.tenant!.name}`;
}

export async function action({
  request,
  context,
}: ActionFunctionArgs): Promise<
  ActionResult<PublicKeyCredentialCreationOptionsJSON, string>
> {
  const user = context.get(userContext);
  if (!user) {
    return { error: "User not found" };
  }

  const userPasskeys = await Passkeys.listForUser(user.id);

  const encoder = new TextEncoder();
  const uint8UserId = encoder.encode(user.id);

  const options = await generateRegistrationOptions({
    rpName: "noo",
    rpID: await getWebAuthnID(request),
    userName: buildUsername(user),
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
