import ProfileLayout from "@/components/Profile/ProfileLayout";
import Passkeys from "@/db/passkeys";
import { uuidToHumanId } from "@/utils";
import { PasskeysPageForm } from "./Form";
import { withAuth } from "@/lib/withAuth";
import { User } from "@/db/users";

async function PasskeysPage({ user }: { user: User }) {
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
    <ProfileLayout user={user}>
      <PasskeysPageForm existingPasskeys={existingPasskeys} />
    </ProfileLayout>
  );
}

export default withAuth(PasskeysPage);
