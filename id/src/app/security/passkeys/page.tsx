import { withAuth } from "@/auth/withAuth";
import ProfileLayout from "@/components/Profile/ProfileLayout";
import Passkeys from "@/db/passkeys";
import { User } from "@/db/users";
import { uuidToHumanId } from "@/utils";
import { PasskeysPageForm } from "./Form";

async function PasskeysPage({ user }: Readonly<{ user: User }>) {
  const existingPasskeys = (await Passkeys.listForUser(user.id)).map(
    (passkey) => {
      return {
        id: uuidToHumanId(passkey.id, "idpsk"),
        name: passkey.name,
        createdAt: passkey.createdAt,
        lastUsedAt: passkey.lastUsedAt,
      };
    },
  );

  return (
    <ProfileLayout>
      <PasskeysPageForm existingPasskeys={existingPasskeys} />
    </ProfileLayout>
  );
}

export default withAuth(PasskeysPage);
