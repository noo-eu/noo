import { Noo } from "@/components/Noo";
import OidcClients, { OidcClient } from "@/db/oidc_clients";
import { findOidcConsent } from "@/db/oidc_consents";
import { AuthorizationRequest } from "@/lib/oidc/authorization";
import { getUserForSession } from "@/lib/SessionsService";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { afterConsent, getOidcAuthorizationCookie } from "./actions";
import Form from "./Form";

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

function cleanupClaims(claims: string[]): string[] {
  const clean: string[] = [];
  for (const claim of claims) {
    switch (claim) {
      case "name":
      case "given_name":
      case "family_name":
      case "middle_name":
      case "nickname":
        clean.push("name");
        break;
      case "preferred_username":
        clean.push("username");
        break;
      case "profile":
      case "picture":
      case "website":
        clean.push("profile");
        break;
      case "email":
      case "email_verified":
        clean.push("email");
        break;
      case "phone_number":
      case "phone_number_verified":
        clean.push("phone_number");
        break;
      case "address":
        clean.push("address");
        break;
      case "gender":
        clean.push("gender");
        break;
      case "birthdate":
        clean.push("birthdate");
        break;
    }
  }

  return Array.from(new Set(clean));
}

export default async function OidcConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ sid: string }>;
}) {
  const t = await getTranslations("oidc");

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

  const consent = await findOidcConsent(oidcAuthRequest.client_id, user.id);
  const client = await OidcClients.find(oidcAuthRequest.client_id);
  if (!client) {
    console.warn("Client not found");
    return redirect("/");
  }

  const name = clientName(client, "en");

  const scopes = oidcAuthRequest.scopes;
  const claims = oidcAuthRequest.claims;
  const claimKeys = new Set(
    Object.keys(claims.id_token || {}).concat(
      Object.keys(claims.userinfo || {}),
    ),
  );

  // openid is automatically granted
  consent.scopes.push("openid");

  const missingScopes = scopes.filter((s) => !consent?.scopes.includes(s));
  const missingClaims = Array.from(claimKeys).filter(
    (c) => !consent?.claims.includes(c),
  );

  if (scopes.length === 1 && scopes[0] === "openid" && claimKeys.size === 0) {
    return redirect("/oidc/continue?sid=" + sessionId);
  }

  if (missingClaims.length === 0 && missingScopes.length === 0) {
    return afterConsent(sessionId);
  }

  const cleanClaims = cleanupClaims(missingClaims);
  if (cleanClaims.length === 0 && missingScopes.length === 0) {
    return afterConsent(sessionId);
  }

  return (
    <div>
      <p className="mb-4 text-lg">
        {t.rich("consent.title", {
          name,
          noo: () => <Noo />,
          strong: (children) => <strong>{children}</strong>,
        })}
      </p>
      <p className="my-4">
        {t.rich("consent.description", {
          name,
          strong: (children) => <strong>{children}</strong>,
        })}
      </p>
      <ul className="list-disc px-4 flex flex-col space-y-1">
        {cleanClaims.map((claim) => (
          <li key={claim}>{t("consent.claims." + claim)}</li>
        ))}
      </ul>

      <Form sessionId={sessionId} />
    </div>
  );
}
