import { startSession } from "@/auth/session";
import { validateOidcCallback } from "@noo/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const oidcState = cookieStore.get("oidc_state")?.value;
  cookieStore.delete("oidc_state");

  const data = await validateOidcCallback(
    request,
    oidcState,
    `${process.env.APP_URL}/auth/callback`,
  );
  if (!data) {
    console.warn("Invalid OIDC callback");
    return redirect("/auth/start");
  }

  await startSession(data.context.sessions);
  redirect("/0");
}
