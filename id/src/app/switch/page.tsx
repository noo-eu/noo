import { getSessions } from "@/auth/SessionsService";
import { PageModal } from "@/components/PageModal";
import { PresentClient } from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import OidcClients from "@/db/oidc_clients";
import { User } from "@/db/users";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Legal } from "../../components/Legal";

export async function generateMetadata() {
  const t = await getTranslations("oidc");

  return {
    title: t("switch.metaTitle"),
    description: "",
  };
}

export default async function AccountSwitcherPage() {
  const sessions = await getSessions();
  const oidcAuthRequest = await getOidcAuthorizationRequest();

  if (!oidcAuthRequest) {
    // The account switcher is only used in the context of an OIDC authorization
    return redirect("/");
  }

  const client = await OidcClients.find(oidcAuthRequest.client_id);
  if (!client) {
    console.warn("Client not found");
    return redirect("/");
  }

  const t = await getTranslations("oidc");
  const locale = await getLocale();

  const clientFields = {
    name: getLocalizedOidcField(client, "clientName", locale)!,
    logo: getLocalizedOidcField(client, "logoUri", locale),
    privacyUrl: getLocalizedOidcField(client, "policyUri", locale),
    tosUrl: getLocalizedOidcField(client, "tosUri", locale),
  };

  const canUse = (user: User) => {
    if (oidcAuthRequest.tenantId) {
      return user.tenantId === oidcAuthRequest.tenantId;
    }
    return true;
  };

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient client={clientFields} title={t("switch.title")} />
        <div>
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <a
                  href={
                    canUse(session.user)
                      ? `/oidc/consent?sid=${session.id}`
                      : "#"
                  }
                  className={`block py-3 px-5 rounded-lg flex ${canUse(session.user) ? "hover:bg-gray-200 dark:hover:bg-gray-800" : "text-gray-400 grayscale cursor-default"}`}
                >
                  <div className="me-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg select-none">
                      {session.user.firstName[0].toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-md font-semibold">
                      {session.user.firstName} {session.user.lastName}
                    </div>
                    <div className="text-gray-400">
                      {session.user.username}@
                      {session.user.tenant?.domain ?? "noomail.eu"}
                    </div>
                  </div>
                </a>
              </li>
            ))}
            <li>
              <a
                href={`/signin`}
                className="block hover:bg-gray-200 dark:hover:bg-gray-800 py-6 px-5 rounded-lg flex"
              >
                <div className="text-md font-semibold flex gap-4">
                  <div className="w-12 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="inline size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                      />
                    </svg>
                  </div>

                  {t("switch.signin")}
                </div>
              </a>
            </li>
          </ul>

          <Legal client={clientFields} className={"mx-6 mt-8"} />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
