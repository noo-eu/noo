import { humanIdToUuid } from "@noo/lib/humanIds";
import {
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { handleSuccessfulAuthentication } from "~/auth.server/success";
import { getTotpSession, totpCookie } from "~/auth.server/totpSession";
import { PageModal } from "~/components/PageModal";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import Passkeys from "~/db.server/passkeys";
import Users from "~/db.server/users.server";
import { getOidcAuthorizationClient } from "~/lib.server/oidc";
import { localeContext } from "~/root";
import { SignInSidePanel } from "~/screens/signin/SignInSidePanel";
import { TotpForm } from "~/screens/signin/totp/TotpForm";
import type { BasicFormAction } from "~/types/ActionResult";
import { makeClientOidcClient } from "~/types/ClientOidcClient";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const userId = await getTotpSession(request);
  if (!userId) {
    return redirect("/signin");
  }

  const hasPasskeys = (await Passkeys.listForUser(userId)).length > 0;

  const oidcClient = await getOidcAuthorizationClient(request);
  const { locale } = context.get(localeContext);

  return {
    userId,
    hasPasskeys,
    oidcClient: oidcClient
      ? makeClientOidcClient(oidcClient, locale)
      : undefined,
  };
}

export default function Page() {
  const { hasPasskeys, oidcClient } = useLoaderData<typeof loader>();

  return (
    <PageModal>
      {oidcClient && <SignInWithNoo />}
      <PageModal.Modal>
        <SignInSidePanel oidcClient={oidcClient} />
        <div>
          <TotpForm hasPasskeys={hasPasskeys} />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}

export async function action({
  request,
}: ActionFunctionArgs): Promise<BasicFormAction> {
  const totpUserId = await getTotpSession(request);
  if (!totpUserId) {
    throw redirect("/signin");
  }

  const user = await Users.find(humanIdToUuid(totpUserId, "usr")!);
  if (!user) {
    throw redirect("/signin");
  }

  const formData = await request.formData();
  const totpCode = formData.get("totp") as string;
  if (!totpCode) {
    return { error: { totp: "credentials" }, input: {} };
  }

  if (!(await Users.verifyTotp(user, totpCode))) {
    return { error: { totp: "credentials" }, input: {} };
  }

  const result = await handleSuccessfulAuthentication(request, user, {});
  if (result.data) {
    throw redirect(result.data, {
      headers: {
        "Set-Cookie": await totpCookie.serialize("", { maxAge: 0 }),
      },
    });
  }

  return { error: { tenant: result.error! }, input: {} };
}
