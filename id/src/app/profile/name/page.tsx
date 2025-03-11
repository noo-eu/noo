import { SessionsService } from "@/lib/SessionsService";
import { Form } from "./Form";
import { uuidToHumanId } from "@/utils";

export default async function ProfileNamePage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const uid = (await searchParams).uid;
  const dbUser = await SessionsService.user(uid);
  if (!dbUser) {
    return undefined;
  }

  const user = {
    id: uuidToHumanId(dbUser.id, "usr"),
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
  };

  return <Form user={user} />;
}
