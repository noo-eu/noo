import { UserIcon } from "@heroicons/react/24/outline";
import { Form } from "react-router";
import { useTranslations } from "use-intl";
import { Legal } from "~/components/Legal";
import { PageModal } from "~/components/PageModal";
import { PresentClient } from "~/components/PresentClient";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import type { ClientOidcClient } from "~/types/ClientOidcClient";
import type { ClientSession } from "~/types/ClientSession.client";
import type { ClientUser } from "~/types/ClientUser.client";

export function AccountSwitcher({
  client,
  sessions,
}: {
  client: ClientOidcClient;
  sessions: ClientSession[];
}) {
  const t = useTranslations("oidc");

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient client={client} title={t("switch.title")} />
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

          <Legal client={client} className={"mx-6 mt-8"} />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}

function SessionItem({
  session,
  tenantId,
}: {
  session: ClientSession;
  tenantId?: string;
}) {
  const canUse = (user: ClientUser) => {
    if (!tenantId) {
      return true;
    }
    return user.tenantId === tenantId;
  };

  return (
    <li key={session.id}>
      <Form method="POST">
        <button
          type="submit"
          className={`text-left cursor-pointer w-full block py-3 px-5 rounded-lg flex ${canUse(session.user) ? "hover:bg-gray-200 dark:hover:bg-gray-800" : "text-gray-400 grayscale cursor-default"}`}
          name="userId"
          value={session.user.id}
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
              {session.user.email ??
                `${session.user.fullName} @ ${session.user.tenant}`}
            </div>
          </div>
        </button>
      </Form>
    </li>
  );
}
