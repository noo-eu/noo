import { endAllSessions, endSession, getActiveSessions } from "@/auth/sessions";
import { Noo } from "@/components/Noo";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { Session } from "@/db/sessions";
import { getClientName } from "@/lib/oidc/clientUtils";
import { buildSubClaim } from "@/lib/oidc/idToken";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Form } from "./Form";

const isValidRedirectUri = (
  client?: OidcClient,
  postLogoutRedirectUri?: string,
) => {
  if (!client || !postLogoutRedirectUri) {
    return false;
  }

  return (
    !client.postLogoutRedirectUris ||
    client.postLogoutRedirectUris.includes(postLogoutRedirectUri)
  );
};

function finish(
  client: OidcClient | undefined,
  postLogoutRedirectUri: string | undefined,
  state: string | undefined,
) {
  if (!isValidRedirectUri(client, postLogoutRedirectUri)) {
    return redirect("/");
  }

  const postRedirect = new URL(postLogoutRedirectUri!);
  if (state) {
    postRedirect.searchParams.set("state", state);
  }

  return redirect(postRedirect.toString());
}

export default async function EndSession({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    clientId?: string;
    sub?: string;
    postLogoutRedirectUri?: string;
    state?: string;
  }>;
}>) {
  const query = await searchParams;
  const t = await getTranslations("oidc");

  let client: OidcClient | undefined;
  if (query.clientId) {
    client = await OidcClients.find(query.clientId);
    if (!client) {
      return redirect("/");
    }
  }

  const name = client ? getClientName(client, "en") : undefined;

  const submitAction = async (data: FormData) => {
    "use server";

    const decision = data.get("decision") as string;
    if (decision === "no") {
      return finish(client, query.postLogoutRedirectUri, query.state);
    }

    const sessions = await getActiveSessions();

    let matchingSession: Session | undefined;
    if (query.sub && client) {
      matchingSession = sessions.find(
        (sess) => buildSubClaim(client, sess.userId) == query.sub,
      );

      if (!matchingSession) {
        return redirect("/");
      }
    }

    if (!matchingSession) {
      await endAllSessions();
    } else {
      await endSession(matchingSession.id);
    }

    return finish(client, query.postLogoutRedirectUri, query.state);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium">{t("end_session.title")}</h1>
      <p>
        {name
          ? t.rich("end_session.description", {
              name,
              strong: (children) => <strong>{children}</strong>,
            })
          : t.rich("end_session.description_no_app", {
              strong: (children) => <strong>{children}</strong>,
            })}
      </p>
      <p>{t.rich("end_session.query", { noo: () => <Noo /> })}</p>
      <Form submitAction={submitAction} />
    </div>
  );
}
