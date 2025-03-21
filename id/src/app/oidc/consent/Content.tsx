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
  fastForward?: boolean;
};

export function Content({ missingClaims, client, user }: Readonly<Props>) {
  const t = useTranslations();
  // const sessionId = useSearchParams().get("sid")!;

  // Breaks the tests.
  // useEffect(() => {
  //   // This is where Next.js breaks down...
  //   // We might want to delete a cookie (afterConsent), but we can't do so during the server-side rendering (poor design IMO).
  //   // So we have to invoke the server action from the client side.
  //   // Of course, useEffect doesn't work if JS is disabled, so JS-less users will have to fall back to clicking the "Continue" button.

  //   if (fastForward) {
  //     afterConsent(sessionId);
  //   }
  // });

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
