import { humanIdToUuid } from "@noo/lib/humanIds";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { withAuth } from "~/auth.server/authLoader";
import { userContext } from "~/auth.server/serverContext";
import Passkeys from "~/db.server/passkeys";
import { PasskeysPage } from "~/screens/security/passkeys/PasskeysPage";
import { makeClientPasskey } from "~/types/ClientPasskey";

export const loader = withAuth(async ({ context }: LoaderFunctionArgs) => {
  const user = context.get(userContext);

  const existingPasskeys = (await Passkeys.listForUser(user.id)).map(
    makeClientPasskey,
  );

  return {
    existingPasskeys,
  };
});

export default function Page() {
  const { existingPasskeys } = useLoaderData<typeof loader>();

  return <PasskeysPage existingPasskeys={existingPasskeys} />;
}

export async function action({ request, context }: LoaderFunctionArgs) {
  const user = context.get(userContext);
  const formData = await request.formData();
  const humanPasskeyId = formData.get("passkeyId")!.toString();
  const passkeyId = humanIdToUuid(humanPasskeyId, "idpsk")!;

  if (request.method === "DELETE") {
    await Passkeys.destroy(user.id, passkeyId);

    return { deleted: true };
  } else if (request.method === "PATCH") {
    const name = formData.get("name")!.toString();

    // Ensure the user is the owner of the passkey
    const passkey = await Passkeys.find(passkeyId);

    if (passkey?.userId !== user.id) {
      return { error: 403 };
    }

    await Passkeys.update(passkeyId, { name });
    return { updated: true };
  } else {
    return new Response("Method Not Allowed", {
      status: 405,
      statusText: "Method Not Allowed",
    });
  }
}
