import Form from "./Form";
import { notFound } from "next/navigation";
import { findOidcConsent } from "@/db/oidc_consents";
import { getCurrentUser } from "@/app/page";
import { afterConsent, getOidcAuthorizationCookie } from "./actions";
import { cookies } from "next/headers";

export const revalidate = 0;

export default async function OidcConsentPage() {
  const cookieStore = await cookies();

  const oidcAuthRequest = await getOidcAuthorizationCookie(cookieStore);
  if (!oidcAuthRequest) {
    console.error("No OIDC authorization request cookie found");
    return notFound();
  }

  const user = await getCurrentUser();
  if (!user) {
    console.error("No user found");
    return notFound();
  }

  // At this point we have authenticated the user, we have to determine if the
  // user has already given consent. If the user has already given consent, we
  // can redirect to the client.

  const consent = await findOidcConsent(oidcAuthRequest.client_id, user.id);

  const scope = oidcAuthRequest.scope.split(" ").filter(Boolean);
  const allScopesGranted = scope.every((s: string) =>
    consent.scopes.includes(s),
  );

  // The simple "openid" scope is always granted
  if (allScopesGranted || (scope.length === 0 && scope[0] === "openid")) {
    // Redirect to the client
    return afterConsent(await cookies());
  }

  return (
    <div>
      <h1>Consent</h1>
      <p>
        You are about to sign in to <strong>example.com</strong> with your
        account.
      </p>
      <p>
        <strong>example.com</strong> will be able to:
      </p>
      <ul>
        <li>Read your profile information</li>
        <li>Read your email address</li>
        <li>Read your phone number</li>
      </ul>
      <p>Do you want to continue?</p>

      <Form />
    </div>
  );
}
