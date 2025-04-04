import { beginOidcFlow } from "@noo/lib/auth";
import { createCookie, redirect } from "react-router";

export const oidcState = createCookie("oidc_state", {
  maxAge: 60 * 30,
  httpOnly: true,
  secure: true,
  sameSite: "lax",
});

export async function loader() {
  const { state, redirectUrl } = beginOidcFlow(
    `${process.env.APP_URL}/auth/callback`,
  );

  // Redirect to the authorization endpoint
  return redirect(redirectUrl, {
    headers: {
      "Set-Cookie": await oidcState.serialize(state),
    },
  });
}
