import { getUserForSession } from "@/auth/SessionsService";
import OidcClients from "@/db/oidc_clients";
import OidcConsents from "@/db/oidc_consents";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { humanIdToUuid } from "@/utils";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Content } from "./Content";

export const revalidate = 0;

export default async function OidcConsentPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ sid: string }>;
}>) {
  const oidcAuthRequest = await getOidcAuthorizationRequest();
  if (!oidcAuthRequest) {
    console.warn("No OIDC auth request found");
    return redirect("/");
  }

  const sessionId = (await searchParams).sid;
  if (!sessionId) {
    console.warn("No session ID found");
    return redirect("/switch");
  }

  const user = await getUserForSession(sessionId);
  if (!user) {
    console.warn("No user found for session");
    return redirect("/switch");
  }

  if (oidcAuthRequest.tenantId && oidcAuthRequest.tenantId !== user.tenantId) {
    console.warn("Tenant mismatch");
    return redirect("/switch");
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const consent = await OidcConsents.findOrInitialize(
    humanIdToUuid(oidcAuthRequest.client_id, "oidc")!,
    user.id,
  );
  const client = await OidcClients.find(consent.clientId);
  if (!client) {
    console.warn("Client not found");
    return redirect("/");
  }

  const locale = await getLocale();
  const clientFields = {
    name: getLocalizedOidcField(client, "clientName", locale)!,
  };

  const scopes = oidcAuthRequest.scopes;
  const claims = oidcAuthRequest.claims;
  const claimKeys = Object.keys({ ...claims.id_token, ...claims.userinfo });

  // openid is automatically granted
  consent.scopes.push("openid");

  const missingScopes = scopes.filter((s) => !consent?.scopes.includes(s));
  const missingClaims = Array.from(claimKeys).filter(
    (c) => !consent?.claims.includes(c),
  );

  if (missingScopes.length > 0) {
    // We're sent to /consent if we're missing scopes or claims
    // However, the /switch page also sends us here when an account is selected.
    // In that case, we can fastForward and confirm the consent (if it was previously granted).
    if (
      scopes.length === 1 &&
      scopes[0] === "openid" &&
      claimKeys.length === 0
    ) {
      return redirect("/oidc/continue?sid=" + sessionId);
    }
  }

  const cleanClaims = cleanupClaims(missingClaims);
  const fastForward = missingScopes.length === 0 && cleanClaims.length === 0;
  const userFields = {
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: `${user.username}@${user.tenant?.domain ?? "noomail.eu"}`,
  };

  return (
    <Content
      client={clientFields}
      missingClaims={cleanClaims}
      fastForward={fastForward}
      user={userFields}
    />
  );
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
