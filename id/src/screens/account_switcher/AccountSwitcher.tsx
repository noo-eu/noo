import { buildUsername } from "@/app/oidc/consent/page";
import { switchSubmit } from "@/app/switch/actions";
import { Legal } from "@/components/Legal";
import { PageModal } from "@/components/PageModal";
import { PresentClient } from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import { OidcClient } from "@/db/oidc_clients";
import { Session } from "@/db/sessions";
import { User } from "@/db/users";
import { getLocalizedOidcField } from "@/lib/oidc/clientUtils";
import { UserIcon } from "@heroicons/react/24/outline";
import { getLocale, getTranslations } from "next-intl/server";

export async function AccountSwitcher({
  client,
  sessions,
}: {
  client: OidcClient;
  sessions: Session[];
}) {
  const locale = await getLocale();
  const t = await getTranslations("oidc");

  const clientFields = {
    name: getLocalizedOidcField(client, "clientName", locale)!,
    logo: getLocalizedOidcField(client, "logoUri", locale),
    privacyUrl: getLocalizedOidcField(client, "policyUri", locale),
    tosUrl: getLocalizedOidcField(client, "tosUri", locale),
  };

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient client={clientFields} title={t("switch.title")} />
        <div>
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                tenantId={client.tenantId ?? undefined}
              />
            ))}
            <li>
              <a
                href={`/signin`}
                className="block hover:bg-gray-200 dark:hover:bg-gray-800 py-6 px-5 rounded-lg flex"
              >
                <div className="text-md font-semibold flex gap-4">
                  <div className="w-12 text-center">
                    <UserIcon className="inline size-6" />
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

function SessionItem({
  session,
  tenantId,
}: {
  session: Session;
  tenantId?: string;
}) {
  const canUse = (user: User) => {
    if (!tenantId) {
      return true;
    }
    return user.tenantId === tenantId;
  };

  const submit = async () => {
    "use server";
    await switchSubmit(session.user.id);
  };

  return (
    <li key={session.id}>
      <form action={submit}>
        <button
          type="submit"
          className={`text-left cursor-pointer w-full block py-3 px-5 rounded-lg flex ${canUse(session.user) ? "hover:bg-gray-200 dark:hover:bg-gray-800" : "text-gray-400 grayscale cursor-default"}`}
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
            <div className="text-gray-400">{buildUsername(session.user)}</div>
          </div>
        </button>
      </form>
    </li>
  );
}
