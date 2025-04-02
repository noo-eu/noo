import { beginOidcFlow } from "@noo/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const { state, redirectUrl } = beginOidcFlow(
    `${process.env.APP_URL}/auth/callback`,
  );

  const cookieStore = await cookies();

  cookieStore.set("oidc_state", state, {
    maxAge: 60 * 30,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });

  // Redirect to the authorization endpoint
  redirect(redirectUrl);
}
