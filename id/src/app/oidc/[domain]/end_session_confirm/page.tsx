import { Noo } from "@/components/Noo";
import OidcClients from "@/db/oidc_clients";
import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { buildSubClaim } from "@/lib/oidc/idToken";
import { humanIdToUuid } from "@/utils";
import { redirect } from "next/navigation";
import { Form } from "./Form";

export default async function EndSession({
  searchParams,
}: {
  searchParams: Promise<{
    clientId: string;
    sub: string;
    postLogoutRedirectUri?: string;
    state?: string;
  }>;
}) {
  const query = await searchParams;

  const client = await OidcClients.find(humanIdToUuid(query.clientId, "oidc")!);
  if (!client) {
    return redirect("/");
  }

  const clientName = client.clientName
    ? client.clientName[""]
    : new URL(client.redirectUris[0]).hostname;

  const sessions = await new SessionsService(
    await getSessionCookie(),
  ).activeSessions();
  const matchingSession = sessions.find(
    (sess) => buildSubClaim(client, sess.userId) == query.sub,
  );

  if (!matchingSession) {
    return redirect("/");
  }

  const submitAction = async (data: FormData) => {
    "use server";

    const decision = data.get("decision") as string;
    if (decision === "yes") {
      await new SessionsService(await getSessionCookie()).endSession(
        matchingSession.id,
      );
    }

    if (!query.postLogoutRedirectUri) {
      return redirect("/");
    }

    if (
      client.postLogoutRedirectUris &&
      !client.postLogoutRedirectUris.includes(query.postLogoutRedirectUri)
    ) {
      return redirect("/");
    }

    const postRedirect = new URL(query.postLogoutRedirectUri);
    if (query.state) {
      postRedirect.searchParams.set("state", query.state);
    }
    return redirect(postRedirect.toString());
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">Terminate your session</h1>
      <p>You logged out from {clientName}.</p>
      <p>
        Would you like to terminate your session on <Noo /> as well?
      </p>
      <Form submitAction={submitAction} />
    </div>
  );
}
