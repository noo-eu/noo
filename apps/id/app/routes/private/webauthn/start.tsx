import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { LoaderFunctionArgs } from "react-router";
import PasskeyChallenges from "~/db.server/passkeyChallenges";

export function getWebAuthnID(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return "id.noo.eu";
  }

  const hdrs = request.headers;
  return hdrs.get("host")?.replace(/:\d+$/, "") ?? "localhost";
}

export function getWebAuthnExpectedOrigin(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return "https://id.noo.eu";
  }

  const hdrs = request.headers;
  const scheme = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("host") ?? "localhost";
  return `${scheme}://${host}`;
}

export async function action({ request }: LoaderFunctionArgs) {
  const options: PublicKeyCredentialRequestOptionsJSON =
    await generateAuthenticationOptions({
      rpID: getWebAuthnID(request),
      userVerification: "required",
    });

  const passkeyChallenge = await PasskeyChallenges.create({
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + 1000 * 60 * 5),
  });

  return { options, passkeyChallengeId: passkeyChallenge.id };
}
