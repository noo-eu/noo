import ProfileLayout from "@/components/Profile/ProfileLayout";
import Passkeys from "@/db/passkeys";
import { SessionsService } from "@/lib/SessionsService";
import { redirect } from "next/navigation";
import { PasskeysPageForm } from "./Form";

export default async function PasskeysPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const uid = (await searchParams).uid!;
  const user = await SessionsService.user(uid);
  if (!user) {
    redirect("/signin");
  }

  const existingPasskeys = (await Passkeys.listForUser(user.id)).map(
    (passkey) => {
      return {
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt,
        lastUsedAt: passkey.lastUsedAt,
      };
    },
  );

  return (
    <ProfileLayout user={user}>
      <PasskeysPageForm uid={uid} existingPasskeys={existingPasskeys} />
    </ProfileLayout>
  );
}
