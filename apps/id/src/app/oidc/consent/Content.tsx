"use client";

import { AccountBox, AccountBoxProps } from "@/components/AccountBox";
import { Legal } from "@/components/Legal";
import { PageModal } from "@/components/PageModal";
import {
  PresentClient,
  PresentClientClientProps,
} from "@/components/PresentClient";
import { SignInWithNoo } from "@/components/SignInWithNoo";
import { useTranslations } from "next-intl";
import Form from "./Form";

type Props = {
  missingClaims: string[];
  client: PresentClientClientProps;
  user: AccountBoxProps["user"];
};

export function Content({ missingClaims, client, user }: Readonly<Props>) {
  const t = useTranslations();

  return (
    <PageModal>
      <SignInWithNoo />
      <PageModal.Modal>
        <PresentClient
          client={client}
          descriptionKey="consent.title"
          descriptionClassName="text-2xl"
          append={<Legal client={client} className="me-16 hidden lg:block" />}
        />
        <div>
          <AccountBox user={user} />
          <p className="mb-4">
            <a
              href="/switch"
              className="py-2.5 inline-block text-blue-600 dark:text-hc-link text-sm"
            >
              {t("oidc.change_account")}
            </a>
          </p>

          {missingClaims.length > 0 && (
            <>
              <p className="my-4">
                {t.rich("oidc.consent.description", {
                  name: client.name,
                  strong: (children) => <strong>{children}</strong>,
                })}
              </p>
              <ul className="list-disc px-4 flex flex-col space-y-1">
                {missingClaims.map((claim) => (
                  <li key={claim}>{t("oidc.consent.claims." + claim)}</li>
                ))}
              </ul>
            </>
          )}
          <Form />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
