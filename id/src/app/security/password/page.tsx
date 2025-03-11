import { SessionsService } from "@/lib/SessionsService";
import { uuidToHumanId } from "@/utils";
import { Form } from "./Form";

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
    passwordChangedAt: dbUser.passwordChangedAt!,
    passwordBreaches: dbUser.passwordBreaches,
    username: dbUser.username,
    normalizedUsername: dbUser.normalizedUsername,
    tenantDomain: dbUser.tenant?.domain,
    birthdate: dbUser.birthdate?.toISOString().split("T")[0],
    hasOtp: !!dbUser.otpSecret,
  };

  return <Form user={user} />;
}
