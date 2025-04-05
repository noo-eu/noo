import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { withAuth } from "~/auth/authLoader";
import { userContext } from "~/auth/serverContext";
import Passkeys from "~/db/passkeys";
import { makeClientPasskey } from "~/lib/types/ClientPasskey";
import { PasskeysPage } from "~/screens/security/passkeys/PasskeysPage";

export const loader = withAuth(
  async ({ request, context }: LoaderFunctionArgs) => {
    const user = context.get(userContext);

    const existingPasskeys = (await Passkeys.listForUser(user.id)).map(
      makeClientPasskey,
    );

    return {
      existingPasskeys,
    };
  },
);

export default function Page() {
  const { existingPasskeys } = useLoaderData<typeof loader>();

  return <PasskeysPage existingPasskeys={existingPasskeys} />;
}
