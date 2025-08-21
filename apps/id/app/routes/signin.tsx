import { redirect, useLoaderData, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { maybeCheckPwnedPassword } from "~/auth.server/hibp";
import { handleSuccessfulAuthentication } from "~/auth.server/success";
import { startTotpSession } from "~/auth.server/totpSession";
import { PageModal } from "~/components/PageModal";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import Users from "~/db.server/users.server";
import { getOidcAuthorizationClient } from "~/lib.server/oidc";
import { localeContext } from "~/root";
import { SignInForm } from "~/screens/signin/SignInForm";
import { SignInSidePanel } from "~/screens/signin/SignInSidePanel";
import { makeClientOidcClient } from "~/types/ClientOidcClient";

import type { Tx } from "~/db.server";
import {
  buildPowRequest,
  getCurrentPowStatus,
  markSigninFailure,
  withPow,
} from "~/lib.server/signin.pow";

export async function loader({ request, context }: ActionFunctionArgs) {
  const oidcClient = await getOidcAuthorizationClient(request);
  const { locale } = context.get(localeContext);

  const { difficulty: powDifficulty } = await getCurrentPowStatus(request);
  let powRequest: string | undefined;
  if (powDifficulty > 0) {
    powRequest = await buildPowRequest(powDifficulty);
  }

  return {
    oidcClient: oidcClient
      ? makeClientOidcClient(oidcClient, locale)
      : undefined,
    powRequest,
  };
}

export default function SignIn() {
  const { oidcClient, powRequest } = useLoaderData<typeof loader>();

  return (
    <PageModal>
      {powRequest && (
        <noscript>
          To allow us to verify that you are not an attacker, we kindly ask you
          to enable JavaScript in your browser.
        </noscript>
      )}

      {oidcClient && <SignInWithNoo />}
      <PageModal.Modal>
        <SignInSidePanel oidcClient={oidcClient} />
        <div>
          <SignInForm powRequest={powRequest} />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

async function signinAction(
  { request }: ActionFunctionArgs,
  formData: FormData,
  tx: Tx,
) {
  if (formData.get("captcha")) {
    // This is a bot, don't even bother
    return { error: "validation", input: { username: "" } };
  }

  const parseResult = signinSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parseResult.success) {
    return { error: "validation", input: { username: "" } };
  }

  const oidcAuthorizationClient = await getOidcAuthorizationClient(request);

  const { username, password } = parseResult.data;
  const user = await Users.authenticate(
    username.trim(),
    password.trim(),
    oidcAuthorizationClient,
  );

  if (!user) {
    await markSigninFailure(request, tx);
    return { error: "credentials", input: { username } };
  }

  await maybeCheckPwnedPassword(user, password);

  if (user.otpSecret) {
    return await startTotpSession(user);
  } else {
    const result = await handleSuccessfulAuthentication<{ username: string }>(
      request,
      user,
      { username },
    );

    if (result.data) {
      return redirect(result.data, {
        headers: result.cookies,
      });
    }

    return result;
  }
}

const action = withPow(signinAction);
export { action };
