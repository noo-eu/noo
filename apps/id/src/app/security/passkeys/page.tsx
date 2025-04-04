import { withAuth } from "@/auth/withAuth";
import Passkeys from "@/db/passkeys";
import { User } from "@/db/users";
import { makeClientPasskey } from "@/lib/types/ClientPasskey";
import { PasskeysPage } from "@/screens/security/passkeys/PasskeysPage";

async function Page({ user }: Readonly<{ user: User }>) {
  const existingPasskeys = (await Passkeys.listForUser(user.id)).map(
    makeClientPasskey,
  );

  return <PasskeysPage existingPasskeys={existingPasskeys} />;
}

export default withAuth(Page);
