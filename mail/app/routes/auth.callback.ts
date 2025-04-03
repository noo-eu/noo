import { validateOidcCallback } from "@noo/lib/auth";
import { createSessionToken } from "@noo/lib/session";
import { redirect } from "react-router";
import Sessions from "~/db/sessions";
import { setSession } from "~/lib/session";
import { oidcState } from "./auth.start";

export async function loader({ request }: { request: Request }) {
  const state = await oidcState.parse(request.headers.get("cookie"));

  const data = await validateOidcCallback(
    request,
    state,
    `${process.env.APP_URL}/auth/callback`,
  );
  if (!data) {
    console.warn("Invalid OIDC callback");
    return redirect("/auth/start", {
      headers: {
        "Set-Cookie": "oidc_state=; Max-Age=0",
      },
    });
  }

  const sessionToken = await startSession(data.context.sessions);
  return redirect("/0", {
    headers: [
      ["Set-Cookie", "oidc_state=; Max-Age=0"],
      ["Set-Cookie", await setSession(sessionToken)],
    ],
  });
}

async function startSession(
  authenticatedSessions: {
    userId: string;
    sessionId: string;
  }[],
) {
  const { sessionId, verifierDigest, token } = createSessionToken();

  await Sessions.create({
    id: sessionId,
    verifierDigest,
    sessionData: {
      authenticatedSessions,
    },
  });

  return token;
}
