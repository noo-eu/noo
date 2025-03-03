import Form from "./Form";
import { redirect } from "next/navigation";
import { getOidcAuthorizationCookie } from "./actions";
import { getUserForSession } from "@/lib/SessionsService";
import { Noo } from "@/components/Noo";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { AuthorizationRequest } from "@/lib/oidc/authorization";

export const revalidate = 0;

function clientName(client: OidcClient, preferredLocale: string) {
  const clientName = client.clientName as Record<string, string>;

  if (clientName[preferredLocale]) {
    return clientName[preferredLocale];
  } else if (clientName[""]) {
    return clientName[""];
  } else if (Object.keys(clientName).length > 0) {
    return Object.values(clientName)[0];
  }

  // Fallback to redirect URI host
  return new URL(client.redirectUris[0]).hostname;
}

export default async function OidcContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ sid: string }>;
}) {
  const oidcAuthRequest =
    (await getOidcAuthorizationCookie()) as AuthorizationRequest;
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const sessionId = (await searchParams).sid;
  if (!sessionId) {
    console.warn("No session ID found");
    return redirect("/");
  }

  const user = await getUserForSession(sessionId);
  if (!user) {
    console.warn("No user found for session");
    return redirect("/");
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const client = await OidcClients.find(oidcAuthRequest.client_id);
  if (!client) {
    console.warn("Client not found");
    return redirect("/");
  }

  const name = clientName(client, "en");

  return (
    <div>
      <p className="mb-4 text-lg">
        You are signing into <strong>{name}</strong> with your <Noo /> account.
      </p>

      <Form sessionId={sessionId} />
    </div>
  );
}
