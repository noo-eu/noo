import { withAuth } from "@/auth/withAuth";
import { schema } from "@/db";
import Sessions from "@/db/sessions";
import { User } from "@/db/users";
import SecurityHub from "@/screens/security/Hub";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("security");

  return {
    title: t.rich("title", { noo: () => "noo" }),
    description: "",
  };
}

async function Page({ user }: Readonly<{ user: User }>) {
  const activeSessions = await Sessions.countBy(
    eq(schema.sessions.userId, user.id),
  );

  return <SecurityHub activeSessions={activeSessions} />;
}

export default withAuth(Page);
