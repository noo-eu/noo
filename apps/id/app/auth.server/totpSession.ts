import { uuidToHumanId } from "@noo/lib/humanIds";
import { jwtVerify, SignJWT } from "jose";
import { createCookie, redirect } from "react-router";
import type { User } from "~/db.server/users.server";
import { getSigningKey } from "~/lib.server/jwks";

export const totpCookie = createCookie("_noo_totp_session", {
  maxAge: 60 * 15,
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});

export async function startTotpSession(
  user: User,
  passedMethods: string[] = ["pwd"],
) {
  // A totp session is a short lived, partially authenticated session
  // that can only be used to submit a TOTP code.

  // This works off a separate session cookie, so that the main session
  // is not affected by the TOTP flow.

  const { key, kid } = (await getSigningKey("EdDSA"))!;
  const token = await new SignJWT({ amr: passedMethods })
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setSubject(uuidToHumanId(user.id, "usr"))
    .setAudience("totp")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);

  return redirect("/signin/otp", {
    headers: {
      "Set-Cookie": await totpCookie.serialize(token),
    },
  });
}

export async function getTotpSession(request: Request) {
  const cookieHeader = await totpCookie.parse(request.headers.get("Cookie"));
  if (!cookieHeader) {
    return undefined;
  }

  const { key } = (await getSigningKey("EdDSA"))!;
  const { payload } = await jwtVerify(cookieHeader, key, {
    audience: "totp",
    algorithms: ["EdDSA"],
  });

  return payload.sub as string;
}
