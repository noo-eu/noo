import { redirect, useLoaderData, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { maybeCheckPwnedPassword } from "~/auth/hibp";
import { handleSuccessfulAuthentication } from "~/auth/success";
import { startTotpSession } from "~/auth/totpSession";
import { PageModal } from "~/components/PageModal";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import Users from "~/db/users.server";
import { getOidcAuthorizationClient } from "~/lib/oidc";
import { makeClientOidcClient } from "~/lib/types/ClientOidcClient";
import { localeContext } from "~/root";
import { SignInForm } from "~/screens/signin/SignInForm";
import { SignInSidePanel } from "~/screens/signin/SignInSidePanel";

export async function loader({ request, context }: ActionFunctionArgs) {
  const oidcClient = await getOidcAuthorizationClient(request);
  const { locale } = context.get(localeContext);

  return {
    oidcClient: oidcClient
      ? makeClientOidcClient(oidcClient, locale)
      : undefined,
  };
}

export default function SignIn() {
  const { oidcClient } = useLoaderData<typeof loader>();

  return (
    <PageModal>
      {oidcClient && <SignInWithNoo />}
      <PageModal.Modal>
        <SignInSidePanel oidcClient={oidcClient} />
        <div>
          <SignInForm />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}

const signinSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
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
        headers: result.cookies.map((cookie) => ["Set-Cookie", cookie]),
      });
    }

    return result;
  }
}
